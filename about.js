import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import {
  AspectRatio,
  Box,
  Container,
  Divider,
  MantineProvider,
  SimpleGrid,
  Stack,
  Text,
  Title,
  createTheme,
} from "https://esm.sh/@mantine/core@8.3.18?deps=react@18.3.1,react-dom@18.3.1";

const rootElement = document.getElementById("about-root");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const theme = createTheme({
  defaultRadius: 0,
  fontFamily: 'Garamond, Baskerville, "Times New Roman", serif',
  headings: {
    fontFamily: 'Garamond, Baskerville, "Times New Roman", serif',
    fontWeight: "400",
  },
  primaryColor: "gray",
});

const teamMembers = [
  {
    name: "Vedant",
    fullName: "Vedant Tyagi",
    title: "Chief Technology Officer",
    href: "vedant-tyagi.html",
    image: "images/team/vedant-tyagi-placeholder.svg",
    alt: "Portrait placeholder for Vedant Tyagi",
    shortBio:
      "I turn early ideas into working products and set the technical path from 0 to 1.",
    fullBio:
      "As CTO of Crucible Ventures, I lead the technical vision and product development side of the venture studio, working closely with teams to take ideas from 0 to 1 and turn them into scalable, high-impact products. My role involves shaping technical strategy, guiding product execution, and ensuring that concepts are translated into real, functional solutions with strong foundations. I focus on building systems, products, and technical roadmaps that allow ventures to move from early idea stage to something tangible, valuable, and capable of growing into a meaningful business.",
  },
  {
    name: "Nandit",
    fullName: "Nandit Shah",
    title: "Chief Executive Officer",
    href: "nandit-shah.html",
    image: "images/team/nandit-shah-placeholder.svg",
    alt: "Portrait placeholder for Nandit Shah",
    shortBio:
      "I shape the studio's direction and work with founders on how new ventures get built and scaled.",
    fullBio:
      "As CEO of Crucible Ventures, I lead the company's vision, strategy, and overall execution, working closely with founders, operators, and investors to build and scale high-potential companies. My role is centered on identifying strong opportunities, setting the long-term direction of the venture studio, and ensuring that each venture is built with ambition, structure, and clarity. I focus on creating the right environment for ideas to grow into real businesses by driving strategy, aligning teams, and pushing execution across every stage of the company-building process.",
  },
  {
    name: "Dyashothan",
    fullName: "Dyashothan Suresh Kumar",
    title: "Chief Financial Officer",
    href: "dyashothan-suresh-kumar.html",
    image: "images/team/dyashothan-suresh-kumar-placeholder.svg",
    alt: "Portrait placeholder for Dyashothan Suresh Kumar",
    shortBio:
      "I evaluate early opportunities, structure the financial side, and pressure-test business models.",
    fullBio:
      "As CFO of Crucible Ventures, I oversee the financial strategy, investment evaluation, and broader structuring of the venture studio. My work focuses on assessing early-stage opportunities through the lens of valuation, market size, business viability, and long-term growth potential. I also play a key role in refining monetisation strategies, supporting financial decision-making, and helping ventures navigate critical stages such as customer validation, commercial planning, and early scaling. Through this, I aim to ensure that each venture is built on strong financial foundations and positioned for sustainable success.",
  },
];

function useIntroProgress() {
  const introRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      const intro = introRef.current;

      if (!intro) {
        return;
      }

      const scrollable = Math.max(intro.offsetHeight * 0.72, 1);
      const nextProgress = clamp(window.scrollY / scrollable, 0, 1);

      setProgress((current) =>
        Math.abs(current - nextProgress) > 0.01 ? nextProgress : current
      );

      document.body.classList.toggle("header-visible", nextProgress < 0.78);
      frameId = 0;
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      document.body.classList.add("header-visible");
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return { introRef, progress };
}

function MemberCard({ member }) {
  return React.createElement(
    Box,
    {
      component: "a",
      href: member.href,
      className: "about-member-link",
      "aria-label": "Open profile for " + member.fullName,
    },
    React.createElement(
      Stack,
      {
        className: "about-member-stack",
        gap: "md",
      },
      React.createElement(
        AspectRatio,
        {
          ratio: 4 / 5,
          className: "about-member-media",
        },
        React.createElement(
          "div",
          {
            className: "about-member-photo-shell",
          },
          React.createElement("img", {
            className: "about-member-photo",
            src: member.image,
            alt: member.alt,
            loading: "lazy",
          }),
          React.createElement(
            "div",
            {
              className: "about-member-photo-namebar",
            },
            React.createElement(
              Text,
              {
                className: "about-member-photo-name",
              },
              member.name
            )
          )
        )
      ),
      React.createElement(
        Stack,
        {
          gap: 10,
          className: "about-member-copy",
        },
        React.createElement(
          Text,
          {
            className: "about-member-bio about-member-bio-short",
          },
          member.shortBio
        )
      ),
      React.createElement(Divider, {
        className: "about-member-divider",
      }),
      React.createElement(
        Text,
        {
          className: "about-member-role",
        },
        member.title
      ),
      React.createElement(
        "div",
        {
          className: "about-member-card-overlay",
        },
        React.createElement(
          Text,
          {
            className: "about-member-card-name",
          },
          member.fullName
        ),
        React.createElement(
          Text,
          {
            className: "about-member-card-copy",
          },
          member.fullBio
        )
      )
    )
  );
}

function AboutPage() {
  const { introRef, progress } = useIntroProgress();

  return React.createElement(
    MantineProvider,
    {
      theme,
      forceColorScheme: "light",
    },
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "section",
        {
          ref: introRef,
          className: "about-intro-section",
          style: {
            "--about-progress": progress.toFixed(4),
          },
        },
        React.createElement(
          "div",
          {
            className: "about-intro-stage",
          },
          React.createElement(
            "div",
            {
              className: "about-intro-panel",
            },
            React.createElement(
              Box,
              {
                className: "about-intro-shell",
              },
              React.createElement(
                Stack,
                {
                  gap: "sm",
                  className: "about-intro-inner",
                },
                React.createElement(
                  Text,
                  {
                    className: "section-label about-intro-label",
                    component: "p",
                  },
                  "About"
                ),
                React.createElement(
                  Title,
                  {
                    order: 1,
                    className: "about-intro-title",
                  },
                  React.createElement(
                    "span",
                    {
                      className: "about-intro-line",
                    },
                    "The team behind"
                  ),
                  React.createElement(
                    "span",
                    {
                      className: "about-intro-line about-intro-line-strong",
                    },
                    "Crucible Ventures."
                  )
                ),
                React.createElement(
                  Text,
                  {
                    className: "about-intro-lead",
                  },
                  "A small operating team working across company design, capital, and product execution."
                )
              )
            )
          )
        )
      ),
      React.createElement(
        "section",
        {
          className: "content-section about-members-section",
          style: {
            "--about-progress": progress.toFixed(4),
          },
        },
        React.createElement(
          Container,
          {
            size: "xl",
          },
          React.createElement(
            SimpleGrid,
            {
              cols: { base: 1, sm: 2, lg: 3 },
              spacing: { base: "xl", lg: 40 },
              verticalSpacing: { base: "xl", lg: 40 },
              className: "about-members-grid",
            },
            teamMembers.map((member) =>
              React.createElement(MemberCard, {
                key: member.href,
                member,
              })
            )
          )
        )
      )
    )
  );
}

if (rootElement) {
  createRoot(rootElement).render(React.createElement(AboutPage));
}
