export function SearchBox() {
  return (
    <form className="w-full flex justify-center font-mono text-sm">
      <input
        type="search"
        className="w-full h-12 p-6 rounded-full bg-slate-950 fg-slate-100 border-2 border-slate-100"
        defaultValue="Search for anything"
      ></input>
    </form>
  );
}
