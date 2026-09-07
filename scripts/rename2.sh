#!/bin/bash
set -e
FILE="$1"
# Drizzle 컬럼 참조
sed -i '' 's/stringJobs\.cutLength/stringJobs.cutLengthMain/g' "$FILE"
# snake_case 컬럼 참조는 없으므로 body.cut_length 만 남음
echo "done: $FILE"