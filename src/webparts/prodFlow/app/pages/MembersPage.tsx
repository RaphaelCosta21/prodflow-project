import * as React from "react";
import MembersManagement from "../components/members/MembersManagement";
import styles from "./MembersPage.module.scss";

export const MembersPage: React.FC = () => (
  <div className={styles.page}>
    <MembersManagement />
  </div>
);

export default MembersPage;
