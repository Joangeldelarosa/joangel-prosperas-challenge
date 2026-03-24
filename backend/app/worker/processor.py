import csv
import io
import json
import logging
import random
import time
import uuid
from datetime import UTC, datetime

import boto3

from app.core.config import settings
from app.core.database import _get_client_kwargs
from app.services.job_service import job_service

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client("s3", **_get_client_kwargs())


def _generate_report_data(report_type: str, parameters: dict) -> dict:
    """Generate dummy report data simulating real analytics output."""
    return {
        "report_type": report_type,
        "parameters": parameters,
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "total_records": random.randint(100, 50_000),
            "unique_users": random.randint(10, 5_000),
            "avg_session_duration_seconds": round(random.uniform(30, 600), 2),
            "conversion_rate": round(random.uniform(0.01, 0.25), 4),
            "revenue_total": round(random.uniform(1_000, 500_000), 2),
        },
        "breakdown": [
            {
                "category": f"category_{i}",
                "count": random.randint(10, 1_000),
                "percentage": round(random.uniform(0.05, 0.30), 4),
            }
            for i in range(1, random.randint(4, 8))
        ],
    }


REPORT_TITLES = {
    "engagement_analytics": "Analítica de Engagement",
    "revenue_breakdown": "Desglose de Ingresos",
    "growth_summary": "Resumen de Crecimiento",
}


def _build_pdf(report_data: dict, report_type: str) -> bytes:
    """Build a styled PDF report using reportlab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * inch)
    styles = getSampleStyleSheet()
    elements: list = []

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#00174b"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#45464d"),
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#0053db"),
        spaceBefore=18,
        spaceAfter=8,
    )

    title = REPORT_TITLES.get(report_type, report_type.replace("_", " ").title())
    elements.append(Paragraph(f"Prosperas — {title}", title_style))

    params = report_data.get("parameters", {})
    date_range = params.get("date_range", {})
    elements.append(
        Paragraph(
            f"Generado: {report_data['generated_at'][:19]}  •  "
            f"Rango: {date_range.get('start', 'N/A')} a {date_range.get('end', 'N/A')}",
            subtitle_style,
        )
    )

    # Summary section
    elements.append(Paragraph("Resumen General", heading_style))
    summary = report_data["summary"]
    summary_data = [
        ["Métrica", "Valor"],
        ["Registros Totales", f"{summary['total_records']:,}"],
        ["Usuarios Únicos", f"{summary['unique_users']:,}"],
        [
            "Duración Promedio de Sesión",
            f"{summary['avg_session_duration_seconds']:.0f}s",
        ],
        ["Tasa de Conversión", f"{summary['conversion_rate'] * 100:.2f}%"],
        ["Ingresos Totales", f"${summary['revenue_total']:,.2f}"],
    ]
    t = Table(summary_data, colWidths=[3 * inch, 2.5 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#00174b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f6")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c6c6cd")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    elements.append(t)

    # Breakdown section
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Desglose por Categoría", heading_style))
    breakdown_data = [["Categoría", "Cantidad", "Porcentaje"]]
    for item in report_data["breakdown"]:
        breakdown_data.append(
            [
                item["category"],
                str(item["count"]),
                f"{item['percentage'] * 100:.2f}%",
            ]
        )
    t2 = Table(breakdown_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
    t2.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0053db")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f6")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c6c6cd")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    elements.append(t2)

    doc.build(elements)
    return buf.getvalue()


def _build_csv(report_data: dict) -> bytes:
    """Build a CSV report from the generated data."""
    buf = io.StringIO()
    writer = csv.writer(buf)

    # Summary rows
    writer.writerow(["Sección", "Métrica", "Valor"])
    summary = report_data["summary"]
    writer.writerow(["Resumen", "Registros Totales", summary["total_records"]])
    writer.writerow(["Resumen", "Usuarios Únicos", summary["unique_users"]])
    writer.writerow(
        [
            "Resumen",
            "Duración Promedio Sesión (s)",
            summary["avg_session_duration_seconds"],
        ]
    )
    writer.writerow(["Resumen", "Tasa de Conversión", summary["conversion_rate"]])
    writer.writerow(["Resumen", "Ingresos Totales", summary["revenue_total"]])

    writer.writerow([])
    writer.writerow(["Categoría", "Cantidad", "Porcentaje"])
    for item in report_data["breakdown"]:
        writer.writerow([item["category"], item["count"], item["percentage"]])

    return buf.getvalue().encode("utf-8")


_FORMAT_BUILDERS: dict[str, tuple] = {
    "pdf": (
        lambda data, rt: _build_pdf(data, rt),
        "application/pdf",
        "pdf",
    ),
    "csv": (
        lambda data, _rt: _build_csv(data),
        "text/csv",
        "csv",
    ),
    "json": (
        lambda data, _rt: json.dumps(data, indent=2).encode("utf-8"),
        "application/json",
        "json",
    ),
}


def process_job(
    job_id: str, user_id: str, report_type: str, parameters: dict
) -> None:
    """Process a single report job: simulate work, upload result to S3, update status."""
    logger.info("Starting processing", extra={"job_id": job_id})

    job_service.update_job_status(job_id, "PROCESSING")

    try:
        # Simulate CPU-bound processing
        sleep_seconds = random.randint(5, 30)
        logger.info(
            "Simulating processing for %d seconds",
            sleep_seconds,
            extra={"job_id": job_id},
        )
        time.sleep(sleep_seconds)

        # Generate report data
        report_data = _generate_report_data(report_type, parameters)

        # Determine output format
        fmt = (parameters.get("format") or "json").lower()
        builder_fn, content_type, ext = _FORMAT_BUILDERS.get(
            fmt, _FORMAT_BUILDERS["json"]
        )
        body = builder_fn(report_data, report_type)

        # Upload to S3
        s3 = _get_s3_client()
        s3_key = f"reports/{user_id}/{job_id}/{uuid.uuid4()}.{ext}"
        s3.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=body,
            ContentType=content_type,
        )

        # Store the S3 key — the API endpoint handles generating accessible URLs
        job_service.update_job_status(job_id, "COMPLETED", result_url=s3_key)
        logger.info("Job completed", extra={"job_id": job_id, "s3_key": s3_key})

    except Exception:
        logger.exception("Job processing failed", extra={"job_id": job_id})
        job_service.update_job_status(job_id, "FAILED")
        raise
