export function ErrorNoteSimple({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-crimson mb-4 rounded-lg border-2 px-4 py-3 font-medium">
      {message}{" "}
      {onRetry && (
        <button type="button" className="text-crimson underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
