import * as React from "react";
import { useNavigate } from "react-router-dom";
import { fidDetailPath } from "../../config/routes";
import styles from "./FidLink.module.scss";

export interface IFidLinkProps {
  fid: string;
}

export const FidLink: React.FC<IFidLinkProps> = ({ fid }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={styles.link}
      onClick={() => navigate(fidDetailPath(fid))}
    >
      {fid}
    </button>
  );
};

export default FidLink;
