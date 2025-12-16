import { motion } from "framer-motion";

const LegalPage = ({ type }) => {
  const content = {
    mentions: {
      title: "Mentions légales",
      sections: [
        {
          title: "Éditeur du site",
          content: `
            <p><strong>Raison sociale :</strong> Alpha Digital</p>
            <p><strong>Nom commercial :</strong> ALPHA Agency</p>
            <p><strong>Forme juridique :</strong> SASU (Société par Actions Simplifiée Unipersonnelle)</p>
            <p><strong>Siège social :</strong> 3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault, Guadeloupe</p>
            <p><strong>Téléphone :</strong> 0691 266 003</p>
            <p><strong>Email :</strong> leo.sperl@alphagency.fr</p>
            <p><strong>Directeur de la publication :</strong> Léo Sperl, Président</p>
          `
        },
        {
          title: "Activités",
          content: `
            <p>Alpha Digital est une agence de communication digitale proposant les services suivants :</p>
            <ul>
              <li>Création et développement de sites internet</li>
              <li>Agence de publicité digitale</li>
              <li>Conseil en stratégie digitale</li>
              <li>Gestion des réseaux sociaux (Community Management)</li>
              <li>Production photo et vidéo</li>
            </ul>
          `
        },
        {
          title: "Hébergement",
          content: `
            <p>Le site est hébergé par des services d'hébergement professionnel sécurisés.</p>
          `
        },
        {
          title: "Propriété intellectuelle",
          content: `
            <p>L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes) est la propriété exclusive d'Alpha Digital ou de ses partenaires. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
          `
        }
      ]
    },
    privacy: {
      title: "Politique de confidentialité",
      sections: [
        {
          title: "Collecte des données personnelles",
          content: `
            <p>Dans le cadre de l'utilisation de notre site, nous sommes amenés à collecter les données personnelles suivantes :</p>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Nom de l'entreprise</li>
              <li>Informations relatives à votre projet</li>
            </ul>
            <p>Ces données sont collectées via le formulaire de contact présent sur notre site.</p>
          `
        },
        {
          title: "Finalité du traitement",
          content: `
            <p>Les données collectées sont utilisées pour :</p>
            <ul>
              <li>Répondre à vos demandes de contact et de devis</li>
              <li>Vous fournir des informations sur nos services</li>
              <li>Établir des devis et factures</li>
              <li>Gérer la relation commerciale</li>
            </ul>
          `
        },
        {
          title: "Conservation des données",
          content: `
            <p>Vos données personnelles sont conservées pendant une durée maximale de 3 ans à compter de notre dernier contact, conformément aux recommandations de la CNIL.</p>
          `
        },
        {
          title: "Vos droits",
          content: `
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul>
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition</li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à : leo.sperl@alphagency.fr</p>
          `
        },
        {
          title: "Responsable du traitement",
          content: `
            <p><strong>Alpha Digital</strong></p>
            <p>3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault, Guadeloupe</p>
            <p>Email : leo.sperl@alphagency.fr</p>
          `
        }
      ]
    },
    cookies: {
      title: "Politique de cookies",
      sections: [
        {
          title: "Qu'est-ce qu'un cookie ?",
          content: `
            <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) lors de la consultation de notre site. Il permet de stocker des informations relatives à votre navigation.</p>
          `
        },
        {
          title: "Types de cookies utilisés",
          content: `
            <p><strong>Cookies techniques (nécessaires) :</strong></p>
            <p>Ces cookies sont indispensables au bon fonctionnement du site. Ils ne peuvent pas être désactivés.</p>
            
            <p><strong>Cookies analytiques :</strong></p>
            <p>Nous utilisons Google Analytics pour analyser la fréquentation de notre site et améliorer votre expérience utilisateur. Ces cookies collectent des informations de manière anonyme.</p>
          `
        },
        {
          title: "Gestion des cookies",
          content: `
            <p>Vous pouvez à tout moment choisir de désactiver ces cookies depuis les paramètres de votre navigateur. Voici les liens vers les pages d'aide des principaux navigateurs :</p>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/fr-fr/help/4468242/microsoft-edge-browsing-data-and-privacy" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
          `
        },
        {
          title: "Durée de conservation",
          content: `
            <p>Les cookies sont conservés pour une durée maximale de 13 mois conformément aux recommandations de la CNIL.</p>
          `
        }
      ]
    }
  };

  const pageContent = content[type] || content.mentions;

  return (
    <div data-testid={`legal-page-${type}`} className="bg-[#050505]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              {pageContent.title}
            </h1>
            <p className="text-[#A1A1AA]">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-12">
            {pageContent.sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass p-8 rounded-lg"
              >
                <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
                <div 
                  className="text-[#A1A1AA] leading-relaxed [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>li]:mb-2 [&>a]:text-[#6A0F1A] [&>a]:hover:underline"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LegalPage;
