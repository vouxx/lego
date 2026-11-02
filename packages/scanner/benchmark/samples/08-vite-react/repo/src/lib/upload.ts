import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 상품 이미지는 브라우저에서 S3 로 바로 올린다
const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: "{{AWS_ACCESS_KEY}}",
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadProductImage(file: File) {
  const key = `products/${crypto.randomUUID()}-${file.name}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: "market-product-images",
      Key: key,
      Body: file,
      ContentType: file.type,
    }),
  );
  return `https://market-product-images.s3.ap-northeast-2.amazonaws.com/${key}`;
}
