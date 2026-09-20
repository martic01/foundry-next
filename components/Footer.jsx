import { Heart, Github, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-inkdim sm:flex-row">
        <span className="flex items-center gap-1.5">
          &copy; {new Date().getFullYear()} Matthew Aboyade. Designed &amp; built with
          <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
        </span>
        <span className="flex items-center gap-4">
          <a href="https://github.com/martic01" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand">
            <Github className="h-4 w-4" /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/matthew-aboyade-23019a320" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand">
            <Linkedin className="h-4 w-4" /> LinkedIn
          </a>
          <a href="https://x.com/Martic_AM" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand">
            <Twitter className="h-4 w-4" /> X
          </a>
        </span>
      </div>
    </footer>
  );
}
