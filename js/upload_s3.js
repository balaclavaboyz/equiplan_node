const fs = require('fs')
const path = require('path')

async function aws_bucket(aws,input_file){
	// section for upload to s3
	var result = await aws.upload({Bucket:'equiplan-html',Body:fs.createReadStream(`./uploads/tmp/${input_file}`), Key:Date.now() + path.extname(input_file)}).promise()
	// hard link to s3 bucket
    return result.Location
}
module.exports = {aws_bucket}