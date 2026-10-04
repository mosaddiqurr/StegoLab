import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

const mount = (route = "/") => render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
describe("simple product", () => {
  it("has exactly the four intended navigation destinations", () => {
    mount();
    expect(within(screen.getByRole("navigation", { name: "Primary" })).getAllByRole("link").map(link => link.textContent)).toEqual(["Home", "Embed", "Extract"]);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Embed data" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Extract data" })).toBeVisible();
  });
  it("shows passwords only when protection is enabled", () => {
    mount("/embed");
    expect(screen.queryByLabelText("Password", { exact: true })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Protect with password" }));
    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
  });
  it("keeps the creator link safe and explains PDF visibility", () => {
    mount("/about");
    expect(screen.getByRole("link", { name: /Mosaddiqur Rahman/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: /Mosaddiqur Rahman/ })).toHaveAttribute("target", "_blank");
    expect(screen.getAllByText(/payloads use an embedded-data container/).length).toBeGreaterThan(0);
  });
  it("redirects an unknown route to Home", () => {
    mount("/unknown");
    expect(screen.getByRole("heading", { name: "StegoLab" })).toBeVisible();
  });
});

