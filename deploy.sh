#!/bin/bash
### Ensure the variable AWS_ACCOUNT_ID is set
# http://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash

function_name="cw-metric-alarm"
handler_name=$function_name".handler"
package_file=$function_name".zip"
runtime=nodejs12.x
description="Implementation of "$function_name
role="arn:aws:iam::588237033746:role/$function_name-role"

if [ -n "$1" ]; then
	if [ $1 == "production" ]; then
		role="arn:aws:iam::967545767730:role/$function_name-role"
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
echo

### Install package dependencies
npm install --loglevel=error --prefix $function_name

### Create the lambda package
cd $function_name
echo Running webpack...
npx webpack
zip -9 -u -j dist/$function_name.zip dist/*

### Check if the function already exists
if [ `aws lambda list-functions | grep $function_name | wc -l` -gt 0 ]; then

	### Update the lambda function
	echo "Updating the Lambda Function: " $function_name
	echo "Result:"
	aws lambda update-function-code \
        --function-name $function_name \
        --zip-file fileb://dist/$package_file \
        --publish
  
  	##aws lambda update-function-configuration \
      ##  --function-name $function_name

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
  	--description "$function_name"

	#### Complete
	rm -f $package_file
	echo "Lambda Creation Complete"
fi