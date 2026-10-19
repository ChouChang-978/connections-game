import classNames from "classnames";
import "./SolvedGroup.scss";
import type { WordGroup } from "./gameData.ts";

export type SolvedGroupProps = {
  solvedGroup: WordGroup;
};

const SolvedGroup = ({ solvedGroup }: SolvedGroupProps) => (
  <div className={classNames("solved-group", solvedGroup.className)}>
    <div className={"title"}>{solvedGroup.description}</div>
    <div>{solvedGroup.words.join(", ")}</div>
  </div>
);

export default SolvedGroup;
