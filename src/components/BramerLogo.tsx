type BramerLogoProps = {
  className?: string;
  light?: boolean;
};

/** Single approved BRAMER vector artwork used throughout the app. */
export default function BramerLogo({ className = '', light = false }: BramerLogoProps) {
  const src = window.location.pathname.startsWith('/brandcreator/')
    ? '/brandcreator/bramer-logo.svg'
    : '/bramer-logo.svg';
  return <img src={src} alt="BRAMER" draggable={false}
    className={['bramer-logo', light ? 'is-light' : 'is-dark', className].filter(Boolean).join(' ')} />;
}
