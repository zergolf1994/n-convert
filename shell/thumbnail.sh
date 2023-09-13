if [[ ! ${1} ]]; then
    echo "No fileId"
    exit 1
fi

localhost="127.0.0.1"
slug=${1}

echo "${slug} | thumbnails generator"

data=$(curl -sLf "http://${localhost}/thumbnail/data/${slug}" | jq -r ".")

error=$(echo $data | jq -r ".error")

if [[ $error == true ]]; then
    msg=$(echo $data | jq -r ".msg")
    echo "${slug} | ${msg}"
    exit 1
fi

video=$(echo $data | jq -r ".video")
interval=$(echo $data | jq -r ".interval")
width=$(echo $data | jq -r ".width")
height=$(echo $data | jq -r ".height")
columns=$(echo $data | jq -r ".columns")
output=$(echo $data | jq -r ".output")
root_dir=$(echo $data | jq -r ".root_dir")


dos2unix ${root_dir}/thumbnail/generator
chmod +x ${root_dir}/thumbnail/generator

sleep 5
${root_dir}/thumbnail/generator ${video} ${interval} ${width} ${height} ${columns} ${output}
sleep 3
curl -sS "http://${localhost}/thumbnail/remote/${slug}"
sleep 3