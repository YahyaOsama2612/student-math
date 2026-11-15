import { useNavigate } from "react-router-dom";
import { Page, PageHead } from "@/components/portal/ui";
import OrdersPanel from "./parts/OrdersPanel";

/* /user/pendingpurchases — the order history, opened on the orders still awaiting approval. */
const PendingPurchases = () => {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHead title="My orders" text="Track your orders and payment checks — awaiting approval, paid or rejected.">
        <button className="pl-btn" onClick={() => navigate("/user/mypurchases")}>What you own →</button>
      </PageHead>
      <OrdersPanel initialStatus="pending" />
    </Page>
  );
};

export default PendingPurchases;
