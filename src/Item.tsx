import classNames from "classnames";
import "./Item.scss";
import type { ReactNode } from "react";

type ItemProps = {
  children: ReactNode;
  selected: boolean;
  itemOnClick: () => void;
};

const Item = ({ children, selected, itemOnClick }: ItemProps) => (
  <div className={classNames("item", { selected })}>
    <button onClick={itemOnClick}>{children}</button>
  </div>
);

export default Item;
