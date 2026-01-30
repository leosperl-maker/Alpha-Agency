import { useState, useEffect } from 'react';
import LinkBioPage from '../pages/public/LinkBioPage';

/**
 * Ce composant détecte si l'utilisateur accède via un domaine personnalisé
 * (ex: bio.antilla-martinique.com) et affiche la page Multilink correspondante.
 * 
 * Domaines connus de l'application (à ne pas traiter comme domaine personnalisé) :
 * - alphagency.fr
 * - localhost
 * - *.preview.emergentagent.com
 */

const KNOWN_DOMAINS = [
  'alphagency.fr',
  'www.alphagency.fr',
  'localhost',
  'preview.emergentagent.com'
];

const isKnownDomain = (hostname) => {
  // Check exact match
  if (KNOWN_DOMAINS.includes(hostname)) return true;
  
  // Check if it's a subdomain of known domains
  for (const domain of KNOWN_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) return true;
  }
  
  // Check localhost with port
  if (hostname.startsWith('localhost')) return true;
  
  // Check if it's an IP address
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
    return <LinkBioPage customDomain={customDomain} />;
  }

  // Sinon, afficher l'application normale
  return children;
};

export default CustomDomainHandler;
