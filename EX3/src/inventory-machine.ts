export type ReservationStatus =
  | "reserved"
  | "checkout"
  | "paid"
  | "expired"
  | "cancelled";

export interface Reservation {
  id: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: number;
}

export interface InventorySnapshot {
  availableStock: number;
  soldStock: number;
  reservations: Reservation[];
}

export class InventoryMachine {
  private availableStock: number;
  private nextId = 1;
  private reservations = new Map<string, Reservation>();
  private readonly reservationDurationMs: number;

  constructor(
    initialStock: number,
    reservationDurationMs = 30_000
  ) {
    if (
      !Number.isSafeInteger(initialStock) ||
      initialStock < 0
    ) {
      throw new RangeError(
        "Initial stock must be a non-negative integer"
      );
    }

    if (
      !Number.isFinite(reservationDurationMs) ||
      reservationDurationMs <= 0
    ) {
      throw new RangeError(
        "Reservation duration must be positive"
      );
    }

    this.availableStock = initialStock;
    this.reservationDurationMs = reservationDurationMs;
  }

  getSnapshot(now = Date.now()): InventorySnapshot {
    this.expireReservations(now);

    const reservations = Array.from(
      this.reservations.values()
    ).map((reservation) => ({ ...reservation }));

    const soldStock = reservations
      .filter((reservation) => reservation.status === "paid")
      .reduce(
        (total, reservation) => total + reservation.quantity,
        0
      );

    return {
      availableStock: this.availableStock,
      soldStock,
      reservations,
    };
  }

  reserve(
    quantity: number,
    now = Date.now()
  ): Reservation | null {
    if (!Number.isFinite(now)) {
      return null;
    }

    this.expireReservations(now);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return null;
    }

    if (quantity > this.availableStock) {
      return null;
    }

    const reservation: Reservation = {
      id: `reservation-${this.nextId++}`,
      quantity,
      status: "reserved",
      expiresAt: now + this.reservationDurationMs,
    };

    this.availableStock -= quantity;
    this.reservations.set(reservation.id, reservation);

    return { ...reservation };
  }

  beginCheckout(
    id: string,
    now = Date.now()
  ): boolean {
    if (!Number.isFinite(now)) {
      return false;
    }

    this.expireReservations(now);

    const reservation = this.reservations.get(id);

    if (!reservation || reservation.status !== "reserved") {
      return false;
    }

    reservation.status = "checkout";
    return true;
  }

  completePayment(
    id: string,
    now = Date.now()
  ): boolean {
    if (!Number.isFinite(now)) {
      return false;
    }

    this.expireReservations(now);

    const reservation = this.reservations.get(id);

    if (!reservation || reservation.status !== "checkout") {
      return false;
    }

    reservation.status = "paid";
    return true;
  }

  cancelReservation(
    id: string,
    now = Date.now()
  ): boolean {
    if (!Number.isFinite(now)) {
      return false;
    }

    this.expireReservations(now);

    const reservation = this.reservations.get(id);

    if (
      !reservation ||
      (reservation.status !== "reserved" &&
        reservation.status !== "checkout")
    ) {
      return false;
    }

    reservation.status = "cancelled";
    this.availableStock += reservation.quantity;

    return true;
  }

  expireReservations(now = Date.now()): number {
    if (!Number.isFinite(now)) {
      return 0;
    }

    let expiredCount = 0;

    for (const reservation of this.reservations.values()) {
      const canExpire =
        reservation.status === "reserved" ||
        reservation.status === "checkout";

      if (canExpire && now >= reservation.expiresAt) {
        reservation.status = "expired";
        this.availableStock += reservation.quantity;
        expiredCount++;
      }
    }

    return expiredCount;
  }
}