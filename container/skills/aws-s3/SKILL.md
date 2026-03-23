---
name: aws-s3
description: Read and write files in AWS S3 buckets using the AWS CLI
---

Use the `aws s3` CLI. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` are pre-configured.

Common patterns:
- List buckets: `aws s3 ls`
- List objects: `aws s3 ls s3://bucket-name/prefix/`
- Download file: `aws s3 cp s3://bucket/key ./local-file`
- Upload file: `aws s3 cp ./local-file s3://bucket/key`
- Sync directory: `aws s3 sync ./dir s3://bucket/prefix/`
- Delete object: `aws s3 rm s3://bucket/key`
