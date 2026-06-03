import { Paperclip } from 'lucide-react';

// Liste de liens de téléchargement pour les pièces jointes d'une annonce.
// Les fichiers sont servis statiquement par le backend sous /uploads/<filename>.
export function Attachments({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((f, i) => (
        <li key={f.filename || i}>
          <a
            href={`/uploads/${f.filename}`}
            target="_blank"
            rel="noreferrer"
            download={f.originalName}
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted"
          >
            <Paperclip className="h-3.5 w-3.5" />
            {f.originalName || f.filename}
          </a>
        </li>
      ))}
    </ul>
  );
}
