import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { Page, PageHead } from "@/components/portal/ui";
import { CourseCatalog, Crumbs, ErrorCard, SkelGrid } from "@/pages/Payment/storeParts";

/* Explore courses (Store design: catalog grid + plan picker + cart → /user/enrollment). */
const MyCourses = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useGet("/api/user/courses");
  const courses = data?.data?.courses || [];
  // selected courses with the plan picked for each one (same shape as before)
  const [selectedCourses, setSelectedCourses] = useState([]);

  return (
    <Page wide>
      <div className={selectedCourses.length ? "pb-24" : ""}>
        <Crumbs parts={[{ label: "Store", to: "/user/payment" }, { label: "Explore courses" }]} />
        <PageHead title="Explore courses" text="Pick an access plan for each course you want — they collect in your cart, then check out once.">
          <button className="btn-ghost" onClick={() => navigate("/user/payment")}>Open the Store</button>
        </PageHead>
        {loading || (!data && !error) ? <SkelGrid /> : error ? <ErrorCard text="Could not load the courses." /> : (
          <CourseCatalog courses={courses} selected={selectedCourses} setSelected={setSelectedCourses} />
        )}
      </div>
    </Page>
  );
};

export default MyCourses;
