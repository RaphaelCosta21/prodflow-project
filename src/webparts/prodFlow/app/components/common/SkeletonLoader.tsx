import * as React from "react";
import styles from "./SkeletonLoader.module.scss";

export interface ISkeletonLoaderProps {
  rows?: number;
}

export const SkeletonLoader: React.FC<ISkeletonLoaderProps> = ({
  rows = 4,
}) => (
  <div className={styles.skeleton}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className={styles.row} />
    ))}
  </div>
);

export default SkeletonLoader;
