# Cleanup partial AWS resources from failed Terraform apply
# Run from PowerShell

$ErrorActionPreference = "Continue"

Write-Host "=== Cleaning up partial Terraform resources ===" -ForegroundColor Yellow

# IAM Roles
Write-Host "`n--- IAM Roles ---"
$executionRole = "prosperas-ecs-task-execution"
$taskRole = "prosperas-ecs-task"

# Detach managed policies from execution role
$attachedPolicies = python -m awscli iam list-attached-role-policies --role-name $executionRole --query "AttachedPolicies[].PolicyArn" --output text 2>$null
if ($attachedPolicies -and $attachedPolicies -ne "None") {
    foreach ($p in $attachedPolicies.Split("`t")) {
        Write-Host "  Detaching policy: $p"
        python -m awscli iam detach-role-policy --role-name $executionRole --policy-arn $p 2>$null
    }
}
python -m awscli iam delete-role --role-name $executionRole 2>$null
Write-Host "  Deleted $executionRole"

# Delete inline policies from task role
$inlinePolicies = python -m awscli iam list-role-policies --role-name $taskRole --query "PolicyNames[]" --output text 2>$null
if ($inlinePolicies -and $inlinePolicies -ne "None") {
    foreach ($p in $inlinePolicies.Split("`t")) {
        Write-Host "  Deleting inline policy: $p"
        python -m awscli iam delete-role-policy --role-name $taskRole --policy-name $p 2>$null
    }
}
python -m awscli iam delete-role --role-name $taskRole 2>$null
Write-Host "  Deleted $taskRole"

# VPC and networking
$vpcId = "vpc-038e03fe791e88142"
Write-Host "`n--- VPC Networking ($vpcId) ---"

# Security groups (delete non-default)
$sgs = python -m awscli ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>$null
if ($sgs -and $sgs -ne "None") {
    # First pass: revoke all ingress rules
    foreach ($sg in $sgs.Split("`t")) {
        python -m awscli ec2 revoke-security-group-ingress --group-id $sg --security-group-rule-ids (python -m awscli ec2 describe-security-group-rules --filters "Name=group-id,Values=$sg" --query "SecurityGroupRules[?!IsEgress].SecurityGroupRuleId" --output text 2>$null) 2>$null
    }
    # Second pass: revoke egress
    foreach ($sg in $sgs.Split("`t")) {
        python -m awscli ec2 revoke-security-group-egress --group-id $sg --security-group-rule-ids (python -m awscli ec2 describe-security-group-rules --filters "Name=group-id,Values=$sg" --query "SecurityGroupRules[?IsEgress].SecurityGroupRuleId" --output text 2>$null) 2>$null
    }
    # Third pass: delete
    foreach ($sg in $sgs.Split("`t")) {
        Write-Host "  Deleting SG: $sg"
        python -m awscli ec2 delete-security-group --group-id $sg 2>$null
    }
}

# Subnets
$subnets = python -m awscli ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[].SubnetId" --output text 2>$null
if ($subnets -and $subnets -ne "None") {
    foreach ($s in $subnets.Split("`t")) {
        Write-Host "  Deleting subnet: $s"
        python -m awscli ec2 delete-subnet --subnet-id $s 2>$null
    }
}

# Route tables (non-main)
$rts = python -m awscli ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpcId" --query "RouteTables[].RouteTableId" --output text 2>$null
if ($rts -and $rts -ne "None") {
    foreach ($rt in $rts.Split("`t")) {
        # Disassociate
        $assocs = python -m awscli ec2 describe-route-tables --route-table-ids $rt --query "RouteTables[0].Associations[?!Main].RouteTableAssociationId" --output text 2>$null
        if ($assocs -and $assocs -ne "None") {
            foreach ($a in $assocs.Split("`t")) {
                python -m awscli ec2 disassociate-route-table --association-id $a 2>$null
            }
        }
        python -m awscli ec2 delete-route-table --route-table-id $rt 2>$null
    }
}

# Internet gateway
$igws = python -m awscli ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpcId" --query "InternetGateways[].InternetGatewayId" --output text 2>$null
if ($igws -and $igws -ne "None") {
    foreach ($igw in $igws.Split("`t")) {
        Write-Host "  Detaching IGW: $igw"
        python -m awscli ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpcId 2>$null
        python -m awscli ec2 delete-internet-gateway --internet-gateway-id $igw 2>$null
    }
}

# Delete VPC
Write-Host "  Deleting VPC: $vpcId"
python -m awscli ec2 delete-vpc --vpc-id $vpcId 2>$null

# CloudWatch Log Groups
Write-Host "`n--- CloudWatch Log Groups ---"
python -m awscli logs delete-log-group --log-group-name /ecs/prosperas/api 2>$null
python -m awscli logs delete-log-group --log-group-name /ecs/prosperas/worker 2>$null
Write-Host "  Deleted log groups"

# ECS
Write-Host "`n--- ECS ---"
python -m awscli ecs delete-cluster --cluster prosperas-cluster 2>$null
Write-Host "  Deleted ECS cluster (if existed)"

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
