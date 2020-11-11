#!/bin/bash
### Ensure the variable AWS_ACCOUNT_ID is set
# http://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash

if ! [[ "$1" =~ ^(dev|staging|production)$ ]]; then
    echo "$1 is not a valid environment."
    exit 1
fi

if ! [[ "$2" =~ ^(us-east-1|eu-west-1|ap-southeast-1)$ ]]; then
    echo "$2 is not a valid region."
    exit 1
fi

function_name_prefix="cw-metric-alarm"
environment="$1"
region="$2"
handler_name=$function_name_prefix".handler"
package_file=$function_name_prefix".zip"
function_name="$function_name_prefix-$environment"
role_name="$function_name-$region-lambda"
runtime=nodejs12.x
description="Implementation of "$function_name
role="arn:aws:iam::588237033746:role/$role_name"

if [ -n "$1" ]; then
	if [[ $1 == "production" || $1 == "staging" ]]; then
		role="arn:aws:iam::967545767730:role/$role_name"
	fi
fi

### Print Header
echo "*******************************"
echo "*  Lambda Deployment Script   *"
echo "*******************************"
echo "Function Name:   "$function_name
echo "Runtime:         "$runtime
echo "Description:     "$description
echo "Role:            "$role
echo "Region:          "$region
echo

### Install package dependencies
npm install --loglevel=error --prefix $function_name_prefix

### Create the lambda package
cd $function_name_prefix
echo Running webpack...
npx webpack
zip -9 -u -j dist/$function_name_prefix.zip dist/*

### Check if the function already exists
if [ `aws lambda list-functions | grep $function_name | wc -l` -gt 0 ]; then

	### Update the lambda function
	echo "Updating the Lambda Function: " $function_name
	echo "Result:"
	aws lambda update-function-code \
        --function-name $function_name \
        --zip-file fileb://dist/$package_file \
        --publish \
		--region $region
  
    ### Complete
    echo "Lambda Update Complete"
else
	### Create the lambda function
	echo "Creating Lambda Function"

	aws lambda create-function \
  	--function-name $function_name \
  	--handler $handler_name \
  	--runtime $runtime \
  	--memory 128 \
  	--timeout 120 \
  	--role $role \
  	--zip-file fileb://dist/$package_file \
  	--description "$function_name" \
	--region $region

	#### Complete
	rm -f $package_file
	echo "Lambda Creation Complete"
fi