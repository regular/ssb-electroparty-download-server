rm -rf unpack/*
rm data.zip
zip -r data data
echo "NEW CONTENT" | ../bin/replace.js data.zip data/magic > unpack/new.zip
cd unpack
unzip new.zip
cd data
cat magic
cd ../..
