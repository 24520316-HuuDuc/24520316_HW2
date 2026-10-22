import { describe, expect, it } from "vitest";
import { InventoryMachine } from "../src/inventory-machine";

describe("InventoryMachine", () => {
  it("reserves stock and prevents overselling", () => {
    const inventory = new InventoryMachine(5, 10_000);

    const first = inventory.reserve(3, 1000);

    expect(first).not.toBeNull();
    expect(inventory.getSnapshot(1000).availableStock).toBe(2);
    expect(inventory.reserve(3, 1000)).toBeNull();
  });

  it("counts stock as sold only after successful payment", () => {
    const inventory = new InventoryMachine(5, 10_000);
    const reservation = inventory.reserve(2, 1000);

    expect(reservation).not.toBeNull();

    const id = reservation!.id;

    expect(inventory.beginCheckout(id, 2000)).toBe(true);
    expect(inventory.getSnapshot(2000).soldStock).toBe(0);

    expect(inventory.completePayment(id, 3000)).toBe(true);

    const snapshot = inventory.getSnapshot(3000);
    expect(snapshot.availableStock).toBe(3);
    expect(snapshot.soldStock).toBe(2);
  });

  it("returns stock after a reservation expires", () => {
    const inventory = new InventoryMachine(5, 10_000);
    const reservation = inventory.reserve(2, 1000);

    expect(reservation).not.toBeNull();

    const id = reservation!.id;

    expect(inventory.expireReservations(10_999)).toBe(0);
    expect(inventory.expireReservations(11_000)).toBe(1);

    const snapshot = inventory.getSnapshot(11_000);

    expect(snapshot.availableStock).toBe(5);
    expect(snapshot.soldStock).toBe(0);
    expect(
      snapshot.reservations.find((item) => item.id === id)?.status
    ).toBe("expired");

    expect(inventory.completePayment(id, 11_001)).toBe(false);
  });

  it("returns stock after cancellation", () => {
    const inventory = new InventoryMachine(5, 10_000);
    const reservation = inventory.reserve(2, 1000);

    expect(reservation).not.toBeNull();

    expect(inventory.cancelReservation(reservation!.id, 2000)).toBe(true);
    expect(inventory.getSnapshot(2000).availableStock).toBe(5);
    expect(inventory.cancelReservation(reservation!.id, 3000)).toBe(false);
  });

  it("rejects invalid quantities", () => {
    const inventory = new InventoryMachine(5);

    expect(inventory.reserve(0, 1000)).toBeNull();
    expect(inventory.reserve(-1, 1000)).toBeNull();
    expect(inventory.reserve(1.5, 1000)).toBeNull();
    expect(inventory.reserve(6, 1000)).toBeNull();

    expect(inventory.getSnapshot(1000).availableStock).toBe(5);
  });
});