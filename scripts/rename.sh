#!/bin/bash
set -e
FILE="$1"
sed -i '' 's/stringJobs\.string_type/stringJobs.stringType/g' "$FILE"
sed -i '' 's/stringJobs\.tension_main/stringJobs.tensionMain/g' "$FILE"
sed -i '' 's/stringJobs\.tension_cross/stringJobs.tensionCross/g' "$FILE"
sed -i '' 's/stringJobs\.job_date/stringJobs.jobDate/g' "$FILE"
sed -i '' 's/stringJobs\.cut_length/stringJobs.cutLength/g' "$FILE"
sed -i '' 's/stringJobs\.racket_id/stringJobs.racketId/g' "$FILE"
sed -i '' 's/stringJobs\.created_at/stringJobs.createdAt/g' "$FILE"
sed -i '' 's/stringJobs\.updated_at/stringJobs.updatedAt/g' "$FILE"
sed -i '' 's/rackets\.customer_id/rackets.customerId/g' "$FILE"
sed -i '' 's/rackets\.racket_model/rackets.racketModel/g' "$FILE"
echo "done: $FILE"