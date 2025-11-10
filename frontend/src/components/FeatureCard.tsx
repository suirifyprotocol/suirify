import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

/*
  FeatureCard
  Reusable presentational card used across the Compliance page to render a small
  icon + title + description block. Accepts either an image URL, a Lucide icon
  component, or a generic React node for maximum flexibility.
*/
type IconLike = LucideIcon | string | React.ReactNode;

interface FeatureCardProps {
  // Accept a Lucide icon component, an image URL string, or any React node
  icon: IconLike;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard = ({ icon, title, description, className }: FeatureCardProps) => {
  return (
    <div className={cn("feature-card", className)}>
      <div className="feature-card-inner">
        <div className="icon-wrapper">
          {typeof icon === "string" ? (
            // If an image URL string is provided, render an <img>
            <img src={icon} alt="" className="icon-svg" />
          ) : typeof icon === "function" ? (
            // If a Lucide icon (function component) is provided
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            React.createElement(icon as LucideIcon, { className: "icon-svg", strokeWidth: 1.5 })
          ) : (
            // Otherwise, render any provided React node
            icon
          )}
        </div>

        <div className="card-text">
          <h3 className="card-title">{title}</h3>
          <p className="card-desc">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
