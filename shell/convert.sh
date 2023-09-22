if [[ ! ${1} ]]; then
    echo "No fileId"
    exit 1
fi

localhost="127.0.0.1"
slug=${1}

echo "${slug} | convert"

data=$(curl -sLf "http://${localhost}/convert/data/${slug}" | jq -r ".")

error=$(echo $data | jq -r ".error")

if [[ $error == true ]]; then
    msg=$(echo $data | jq -r ".msg")
    echo "${slug} | ${msg}"
    exit 1
fi
#เรียกดูความละเอียดทั้งหมด
resolutions=$(echo $data | jq -r ".resolutions[]")
useType=$(echo $data | jq -r ".useType")
#วนลูป เพื่อ ประมวลผลไฟล์ + อัพโหลดขึ้น Storage
for resolution in $resolutions; do
    echo "${slug} | convert | $resolution"

    post_url="http://${localhost}/convert/"
    json_data="{\"slug\": \"${slug}\", \"quality\": \"${resolution}\", \"useType\": \"${useType}\"}"
    curl -X POST -H "Content-Type: application/json" -d "$json_data" "$post_url"
    curl -sS "http://${localhost}/remote/${slug}/${resolution}"
    sleep 2
done