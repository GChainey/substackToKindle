import SubstackUrlInput from "@/components/SubstackUrlInput";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Substack to Kindle</h1>
        <p className="text-gray-500 text-lg">
          Convert any Substack newsletter into Kindle-ready EPUBs with images and footnotes.
        </p>
      </div>
      <SubstackUrlInput />
      <p className="text-xs text-gray-400 max-w-md text-center">
        Enter a Substack URL or subdomain. You&apos;ll be able to pick which posts to convert.
        Supports paid content if you provide your session cookie.
      </p>
    </div>
  );
}
