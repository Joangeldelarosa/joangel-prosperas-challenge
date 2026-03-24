#!/bin/bash
# Cleanup partial Terraform resources
set -e

export AWS_DEFAULT_REGION=us-east-1
VPC_ID="vpc-038e03fe791e88142"

echo "=== Deleting ECS Services ==="
aws ecs delete-service --cluster prosperas-cluster --service prosperas-api --force 2>/dev/null || echo "No API service"
aws ecs delete-service --cluster prosperas-cluster --service prosperas-worker --force 2>/dev/null || echo "No Worker service"

echo "=== Deleting ECS Cluster ==="
aws ecs delete-cluster --cluster prosperas-cluster 2>/dev/null || echo "No cluster"

echo "=== Deleting ALB Listeners ==="
for arn in $(aws elbv2 describe-listeners --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-1:026818612421:loadbalancer/app/prosperas-api-alb/4fb6b80837e7e23b" --query "Listeners[].ListenerArn" --output text 2>/dev/null); do
  echo "Deleting listener: $arn"
  aws elbv2 delete-listener --listener-arn "$arn"
done

echo "=== Deleting ALB ==="
aws elbv2 delete-load-balancer --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-1:026818612421:loadbalancer/app/prosperas-api-alb/4fb6b80837e7e23b" 2>/dev/null || echo "No ALB"
sleep 5

echo "=== Deleting Target Groups ==="
for arn in $(aws elbv2 describe-target-groups --query "TargetGroups[?VpcId=='$VPC_ID'].TargetGroupArn" --output text 2>/dev/null); do
  echo "Deleting TG: $arn"
  aws elbv2 delete-target-group --target-group-arn "$arn"
done

echo "=== Deleting SQS Queues ==="
for url in $(aws sqs list-queues --queue-name-prefix "prosperas" --query "QueueUrls[]" --output text 2>/dev/null); do
  echo "Deleting queue: $url"
  aws sqs delete-queue --queue-url "$url"
done

echo "=== Deleting DynamoDB Tables ==="
aws dynamodb delete-table --table-name prosperas-jobs 2>/dev/null || echo "No jobs table"
aws dynamodb delete-table --table-name prosperas-users 2>/dev/null || echo "No users table"

echo "=== Deleting IAM Roles ==="
# Detach policies first
for policy in $(aws iam list-attached-role-policies --role-name prosperas-ecs-task-execution --query "AttachedPolicies[].PolicyArn" --output text 2>/dev/null); do
  aws iam detach-role-policy --role-name prosperas-ecs-task-execution --policy-arn "$policy"
done
aws iam delete-role --role-name prosperas-ecs-task-execution 2>/dev/null || echo "No execution role"

for policy in $(aws iam list-role-policies --role-name prosperas-ecs-task --query "PolicyNames[]" --output text 2>/dev/null); do
  aws iam delete-role-policy --role-name prosperas-ecs-task --policy-name "$policy"
done
aws iam delete-role --role-name prosperas-ecs-task 2>/dev/null || echo "No task role"

echo "=== Deleting Security Groups ==="
for sg in $(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>/dev/null); do
  echo "Deleting SG: $sg"
  # Remove ingress rules referencing other SGs first
  aws ec2 revoke-security-group-ingress --group-id "$sg" --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissions' --output json)" 2>/dev/null || true
  aws ec2 delete-security-group --group-id "$sg" 2>/dev/null || echo "Failed to delete SG $sg (may have dependencies)"
done

echo "=== Deleting Subnets ==="
for subnet in $(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[].SubnetId" --output text 2>/dev/null); do
  echo "Deleting subnet: $subnet"
  aws ec2 delete-subnet --subnet-id "$subnet"
done

echo "=== Deleting Route Tables ==="
for rt in $(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --query "RouteTables[?Associations[0].Main!=\`true\`].RouteTableId" --output text 2>/dev/null); do
  echo "Deleting route table: $rt"
  # Disassociate first
  for assoc in $(aws ec2 describe-route-tables --route-table-ids "$rt" --query "RouteTables[0].Associations[].RouteTableAssociationId" --output text 2>/dev/null); do
    aws ec2 disassociate-route-table --association-id "$assoc" 2>/dev/null || true
  done
  aws ec2 delete-route-table --route-table-id "$rt"
done

echo "=== Detaching and Deleting Internet Gateway ==="
for igw in $(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query "InternetGateways[].InternetGatewayId" --output text 2>/dev/null); do
  echo "Detaching IGW: $igw"
  aws ec2 detach-internet-gateway --internet-gateway-id "$igw" --vpc-id "$VPC_ID"
  aws ec2 delete-internet-gateway --internet-gateway-id "$igw"
done

echo "=== Deleting VPC ==="
aws ec2 delete-vpc --vpc-id "$VPC_ID"

echo "=== Deleting CloudWatch Log Groups ==="
aws logs delete-log-group --log-group-name /ecs/prosperas/api 2>/dev/null || echo "No API log group"
aws logs delete-log-group --log-group-name /ecs/prosperas/worker 2>/dev/null || echo "No worker log group"

echo "=== CLEANUP COMPLETE ==="
