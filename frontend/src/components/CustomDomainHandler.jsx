import { useState, useEffect, lazy, Suspense } from 'react';
// Lazy : LinkBioPage embarque remark-gfm (regex lookbehind non supporté par Safari iOS < 16.4).
// L'isoler hors du bundle principal évite que ce regex casse le parsing de toute l'app.
const LinkBioPage = lazy(() => import('../pages/public/LinkBioPage'));

/**
 * Ce composant détecte si l'utilisateur accède via un domaine personnalisé
 * et affiche la page Multilink correspondante. Deux cas servent une page client :
 *  - domaine propre du client (ex: bio.antilla-martinique.com)
 *  - sous-domaine wildcard de l'agence (ex: antilla.alphagency.fr)
 *
 * L'apex alphagency.fr + www (et quelques sous-domaines réservés) restent l'app.
 */

// Domaine racine de l'agence : apex + www = site/app ; les AUTRES sous-domaines = pages clients.
const ROOT_DOMAIN = 'alphagency.fr';
const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api', 'mail', 'ftp', 'cdn', 'static', 'staging', 'dev', 'preview'];

// Autres domaines techniques (et leurs sous-domaines) à ne jamais traiter comme custom.
const KNOWN_DOMAINS = ['localhost', 'preview.emergentagent.com'];

const isKnownDomain = (hostname) => {
  hostname = (hostname || '').toLowerCase();

  // Apex de l'agence
  if (hostname === ROOT_DOMAIN) return true;

  // Sous-domaine de l'agence : réservé => app ; sinon => page client (custom domain)
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -`.${ROOT_DOMAIN}`.length).split('.').pop();
    return RESERVED_SUBDOMAINS.includes(sub);
  }

  // Domaines techniques + leurs sous-domaines
  if (KNOWN_DOMAINS.includes(hostname)) return true;
  for (const domain of KNOWN_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) return true;
  }

  // localhost avec port + adresses IP
  if (hostname.startsWith('localhost')) return true;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

  return false;
};

const CustomDomainHandler = ({ children }) => {
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const hostname = window.location.hostname;
    
    if (!isKnownDomain(hostname)) {
      // C'est un domaine personnalisé
      setIsCustomDomain(true);
      setCustomDomain(hostname);
    }
    
    setChecking(false);
  }, []);

  // Pendant la vérification, ne rien afficher (évite le flash)
  if (checking) {
    return null;
  }

  // Si c'est un domaine personnalisé, afficher directement la page Multilink
  if (isCustomDomain && customDomain) {
    return (
      <Suspense fallback={null}>
        <LinkBioPage customDomain={customDomain} />
      </Suspense>
    );
  }

  // Sinon, afficher l'application normale
  return children;
};

export default CustomDomainHandler;
