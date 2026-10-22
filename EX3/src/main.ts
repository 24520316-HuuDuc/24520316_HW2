import "./style.css";
import { createAntiDriftTimer } from "./anti-drift-timer";
import { InventoryMachine } from "./inventory-machine";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Không tìm thấy phần tử #app");
}

const SALE_DURATION_MS = 3 * 60 * 1000;
const RESERVATION_DURATION_MS = 15 * 1000;

const inventory = new InventoryMachine(10, RESERVATION_DURATION_MS);

let saleEnded = false;
let currentReservationId: string | null = null;
let notice = "Nhanh tay giữ hàng trước khi hết lượt!";
let reservationFrame: number | null = null;

app.innerHTML = `
  <div class="page">
    <header class="topbar">
      <a class="brand" href="#">
        <span class="brand-icon">S</span>
        <span>FLASH<span class="brand-highlight">SALE</span></span>
      </a>
      <span class="market-label">VIETNAM MEGA SALE</span>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">SỰ KIỆN MUA SẮM ĐẶC BIỆT</span>
          <h1>Chớp deal.<br /><span>Săn giá hời.</span></h1>
          <p>
            Ưu đãi có giới hạn. Giữ sản phẩm ngay trước khi
            kho hàng được bán hết!
          </p>
          <div class="sale-status">
            <span class="live-dot"></span>
            <span id="sale-state">FLASH SALE ĐANG DIỄN RA</span>
          </div>
        </div>

        <div class="countdown-card">
          <p>THỜI GIAN CÒN LẠI</p>
          <div id="countdown" class="countdown">03:00</div>
          <span>Thời gian tính theo đồng hồ thực</span>
        </div>
      </section>

      <section class="section-heading">
        <div>
          <span class="eyebrow">DEAL NỔI BẬT</span>
          <h2>Sản phẩm hôm nay</h2>
        </div>
        <span class="limited-label">SỐ LƯỢNG CÓ HẠN</span>
      </section>

      <section class="product-card">
        <div class="product-visual">
          <span class="product-badge">FLASH DEAL</span>
          <div class="product-emoji">🎧</div>
          <div class="product-caption">TECHNOLOGY COLLECTION</div>
        </div>

        <div class="product-info">
          <span class="category">PHỤ KIỆN CÔNG NGHỆ</span>
          <h2>Tai nghe không dây</h2>
          <p class="description">
            Thiết kế hiện đại, nhỏ gọn, phù hợp cho học tập
            và giải trí mỗi ngày.
          </p>

          <div class="price-row">
            <span class="current-price">399.000đ</span>
            <span class="old-price">799.000đ</span>
            <span class="discount">-50%</span>
          </div>

          <div class="stock-panel">
            <div class="stock-item">
              <span>Tồn kho khả dụng</span>
              <strong id="available-stock">10</strong>
            </div>
            <div class="stock-item">
              <span>Đã bán thành công</span>
              <strong id="sold-stock">0</strong>
            </div>
          </div>

          <div class="reservation-panel">
            <div>
              <span class="panel-label">TRẠNG THÁI ĐẶT HÀNG</span>
              <strong id="reservation-status">Chưa giữ hàng</strong>
            </div>
            <span id="reservation-clock" class="reservation-clock">
              Chưa có lượt giữ hàng
            </span>
          </div>

          <div class="actions">
            <button data-action="reserve" class="button button-primary">
              Giữ hàng ngay
            </button>
            <button data-action="checkout" class="button button-secondary">
              Tiến hành thanh toán
            </button>
          </div>

          <button data-action="pay" class="button button-pay">
            Xác nhận thanh toán (mô phỏng)
          </button>

          <button data-action="cancel" class="button button-cancel">
            Hủy giữ hàng
          </button>

          <p id="notice" class="notice" aria-live="polite"></p>
        </div>
      </section>

      <section class="rules">
        <h2>Cách tham gia Flash Sale</h2>
        <div class="rule-grid">
          <article class="rule">
            <span>01</span>
            <h3>Giữ hàng</h3>
            <p>Mỗi lượt giữ một sản phẩm trong 15 giây.</p>
          </article>
          <article class="rule">
            <span>02</span>
            <h3>Thanh toán</h3>
            <p>Chuyển sang thanh toán trước khi giữ hàng hết hạn.</p>
          </article>
          <article class="rule">
            <span>03</span>
            <h3>Hoàn kho</h3>
            <p>Hàng được trả lại kho nếu lượt giữ hàng hết hạn hoặc bị hủy.</p>
          </article>
        </div>
      </section>
    </main>

    <footer>
      FlashSale VN · Mô phỏng phục vụ bài tập HW3
    </footer>
  </div>
`;

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCurrentReservation() {
  if (!currentReservationId) return undefined;

  return inventory
    .getSnapshot()
    .reservations.find(
      (reservation) => reservation.id === currentReservationId
    );
}

function renderInventory(): void {
  const snapshot = inventory.getSnapshot();
  const reservation = snapshot.reservations.find(
    (item) => item.id === currentReservationId
  );

  const active =
    reservation?.status === "reserved" ||
    reservation?.status === "checkout";

  const availableStock = app!.querySelector("#available-stock");
  const soldStock = app!.querySelector("#sold-stock");
  const reservationStatus = app!.querySelector("#reservation-status");
  const reservationClock = app!.querySelector("#reservation-clock");
  const noticeElement = app!.querySelector("#notice");

  if (availableStock) {
    availableStock.textContent = String(snapshot.availableStock);
  }

  if (soldStock) {
    soldStock.textContent = String(snapshot.soldStock);
  }

  const statusLabels: Record<string, string> = {
    reserved: "Đã giữ hàng",
    checkout: "Đang thanh toán",
    paid: "Đã thanh toán thành công",
    expired: "Lượt giữ hàng đã hết hạn",
    cancelled: "Đã hủy giữ hàng",
  };

  if (reservationStatus) {
    reservationStatus.textContent = reservation
      ? statusLabels[reservation.status]
      : "Chưa giữ hàng";
  }

  if (reservationClock) {
    if (active && reservation) {
      const remaining = Math.max(
        0,
        reservation.expiresAt - Date.now()
      );

      reservationClock.textContent =
        `Còn ${Math.ceil(remaining / 1000)} giây giữ hàng`;
    } else {
      reservationClock.textContent = "Không có lượt giữ hàng đang hoạt động";
    }
  }

  const reserveButton = app!.querySelector<HTMLButtonElement>(
    '[data-action="reserve"]'
  );
  const checkoutButton = app!.querySelector<HTMLButtonElement>(
    '[data-action="checkout"]'
  );
  const payButton = app!.querySelector<HTMLButtonElement>(
    '[data-action="pay"]'
  );
  const cancelButton = app!.querySelector<HTMLButtonElement>(
    '[data-action="cancel"]'
  );

  if (reserveButton) {
    reserveButton.disabled = saleEnded || Boolean(active);
  }

  if (checkoutButton) {
    checkoutButton.disabled = reservation?.status !== "reserved";
  }

  if (payButton) {
    payButton.disabled = reservation?.status !== "checkout";
  }

  if (cancelButton) {
    cancelButton.disabled = !active;
  }

  if (noticeElement) {
    noticeElement.textContent = notice;
  }
}

function refreshReservation(): void {
  renderInventory();

  const reservation = getCurrentReservation();
  const active =
    reservation?.status === "reserved" ||
    reservation?.status === "checkout";

  if (active) {
    reservationFrame = requestAnimationFrame(refreshReservation);
  } else {
    reservationFrame = null;
  }
}

function startReservationRefresh(): void {
  if (reservationFrame === null) {
    reservationFrame = requestAnimationFrame(refreshReservation);
  }
}

app.addEventListener("click", (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest<HTMLButtonElement>(
    "button[data-action]"
  );

  if (!button || button.disabled) return;

  const action = button.dataset.action;

  if (action === "reserve") {
    if (saleEnded) {
      notice = "Flash Sale đã kết thúc.";
    } else {
      const reservation = inventory.reserve(1);

      if (!reservation) {
        notice = "Kho đã hết hàng hoặc số lượng không hợp lệ.";
      } else {
        currentReservationId = reservation.id;
        notice = "Giữ hàng thành công! M có 15 giây để thanh toán.";
        startReservationRefresh();
      }
    }
  }

  if (action === "checkout") {
    const id = currentReservationId;
    const success = id ? inventory.beginCheckout(id) : false;

    notice = success
      ? "Đã chuyển sang trạng thái thanh toán."
      : "Không thể thanh toán: lượt giữ hàng không còn hợp lệ.";
  }

  if (action === "pay") {
    const id = currentReservationId;
    const success = id ? inventory.completePayment(id) : false;

    notice = success
      ? "Thanh toán thành công! Sản phẩm đã được bán."
      : "Thanh toán thất bại hoặc lượt giữ hàng đã hết hạn.";
  }

  if (action === "cancel") {
    const id = currentReservationId;
    const success = id ? inventory.cancelReservation(id) : false;

    notice = success
      ? "Đã hủy lượt giữ hàng và hoàn hàng về kho."
      : "Không thể hủy lượt giữ hàng này.";
  }

  renderInventory();
});

createAntiDriftTimer(
  SALE_DURATION_MS,
  (remainingMs) => {
    const countdown = app!.querySelector("#countdown");

    if (countdown) {
      countdown.textContent = formatCountdown(remainingMs);
    }
  },
  () => {
    saleEnded = true;

    const saleState = app!.querySelector("#sale-state");
    const countdown = app!.querySelector("#countdown");

    if (saleState) {
      saleState.textContent = "FLASH SALE ĐÃ KẾT THÚC";
    }

    if (countdown) {
      countdown.textContent = "00:00";
    }

    notice = "Đợt Flash Sale đã kết thúc. Không thể giữ lượt mới.";
    renderInventory();
  }
);

renderInventory();