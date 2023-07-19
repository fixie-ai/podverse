export function Logo() {
  return (
    <a
      className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
      href="https://fixie.ai"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src="https://docs.fixie.ai/assets/fixie-logo-docs.png"
        alt="Fixie Logo"
        width={100}
        height={24}
      />
    </a>
  )
}
