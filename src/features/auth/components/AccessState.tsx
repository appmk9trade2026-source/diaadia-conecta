type AccessStateProps = {
  title: string;
  message: string;
};

export function AccessState({ title, message }: AccessStateProps) {
  return (
    <main className="access-state">
      <section>
        <span className="brand-mark">DC</span>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
