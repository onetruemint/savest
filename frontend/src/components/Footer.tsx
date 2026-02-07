import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="py-10 bg-dark text-offwhite">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 font-semibold">
            <Image
              src="/SavestRound.svg"
              alt="Savent logo"
              width={48}
              height={48}
            />
            <span>Savest</span>
          </div>

          <div className="flex gap-8">
            <Link
              href="#"
              className="text-sm text-mint hover:text-offwhite transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-mint hover:text-offwhite transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-sm text-mint hover:text-offwhite transition-colors"
            >
              Contact
            </Link>
          </div>

          <div className="text-sm text-offwhite/50">
            &copy; {new Date().getFullYear()} Savest. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
