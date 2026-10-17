const COLUMNS = [
  { title: "Useful Links", links: ["Website Policies", "Help", "Sitemap", "Feedback", "Terms & Conditions"] },
  { title: "Services", links: ["Registration", "Certificates", "Schemes", "Grievance Redressal", "Downloads"] },
  { title: "Related Sites", links: ["Tax Department", "Food Safety Authority", "Labour Department", "State Portals"] },
];

export function PortalFooter() {
  return (
    <footer className="bg-slate-800 text-slate-300 text-sm mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-semibold text-white mb-2">{col.title}</p>
            <ul className="space-y-1">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:underline">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 pb-4 px-4">
        Content owned by a fictional department. Built only to demonstrate intent0.
      </p>
    </footer>
  );
}
