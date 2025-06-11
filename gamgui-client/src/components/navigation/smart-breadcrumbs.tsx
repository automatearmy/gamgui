import { Link, useLocation, useParams } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbItem = {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
  key: string;
};

export function SmartBreadcrumbs() {
  const location = useLocation();
  const params = useParams();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard as root
    if (pathSegments.length === 0) {
      // We're on the root/dashboard page
      return [{ label: "Dashboard", isCurrentPage: true, key: "dashboard" }];
    }

    // Add Dashboard as first breadcrumb for non-root pages
    breadcrumbs.push({ label: "Dashboard", href: "/", key: "dashboard" });

    // Process each path segment
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      switch (segment) {
        case "sessions":
          breadcrumbs.push({
            label: "Sessions",
            href: isLast ? undefined : "/sessions",
            isCurrentPage: isLast,
            key: "sessions",
          });
          break;
        case "settings":
          breadcrumbs.push({
            label: "Settings",
            href: isLast ? undefined : "/settings",
            isCurrentPage: isLast,
            key: "settings",
          });
          break;
        case "profile":
          breadcrumbs.push({
            label: "Profile",
            href: isLast ? undefined : "/profile",
            isCurrentPage: isLast,
            key: "profile",
          });
          break;
        default:
          // Handle dynamic segments like session IDs
          if (params.id && segment === params.id) {
            breadcrumbs.push({
              label: `Session ${segment}`,
              isCurrentPage: isLast,
              key: `session-${segment}`,
            });
          }
          else {
            // Capitalize first letter for unknown segments
            const label = segment.charAt(0).toUpperCase() + segment.slice(1);
            breadcrumbs.push({
              label,
              href: isLast ? undefined : currentPath,
              isCurrentPage: isLast,
              key: segment,
            });
          }
          break;
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.key} className="flex items-center">
            <BreadcrumbItem>
              {crumb.isCurrentPage
                ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )
                : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href!}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
