export function FileList({ files }: { files: { id: string; name: string }[] }) {
  return (
    <ul>
      {files.map((f) => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  );
}
