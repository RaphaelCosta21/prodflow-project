import * as React from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "../../config/appConfig";
import { ROUTES } from "../../config/routes";
import prodflowLockup from "../../../assets/brand/prodflow-lockup.png";
import oiiWhiteLogo from "../../../assets/OII-white-transparent-vetorizado.svg";
import styles from "./Footer.module.scss";

const KEYWORDS = ["ENGENHARIA", "PROJETOS", "FABRICAÇÃO", "MONTAGEM"];

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now.toLocaleTimeString("pt-BR", { hour12: false });

  return (
    <footer className={styles.footer}>
      <span className={styles.keywords}>
        {KEYWORDS.map((word, i) => (
          <React.Fragment key={word}>
            {i > 0 && <span className={styles.dot}>·</span>}
            <span>{word}</span>
          </React.Fragment>
        ))}
      </span>

      <span className={styles.circuit} aria-hidden="true" />

      <span className={styles.middle}>
        <span className={styles.version}>v{APP_CONFIG.appVersion}</span>
        <button
          type="button"
          className={styles.patchLink}
          onClick={() => navigate(ROUTES.patchNotes)}
        >
          Patch Notes
        </button>
        <span className={styles.clock}>{clock}</span>
        <a
          className={styles.oiiLink}
          href={APP_CONFIG.companyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img className={styles.oii} src={oiiWhiteLogo} alt="Oceaneering" />
        </a>
      </span>

      <span className={styles.right}>
        <img className={styles.lockup} src={prodflowLockup} alt="ProdFlow" />
        <span className={styles.rule} />
        <span className={styles.orgs}>
          <span>CIDEQ</span>
          <span className={styles.orgDivider}>|</span>
          <span>OCEANEERING</span>
        </span>
      </span>
    </footer>
  );
};

export default Footer;
