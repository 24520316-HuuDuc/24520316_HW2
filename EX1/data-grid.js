 
const employees = [
  { id: 1001, name: "Nguyen Minh Anh", department: "Engineering", email: "minhanh@example.com", status: "Active" },
  { id: 1002, name: "Tran Quoc Bao", department: "Marketing", email: "quocbao@example.com", status: "Active" },
  { id: 1003, name: "Le Thu Ha", department: "Finance", email: "thuha@example.com", status: "Inactive" },
  { id: 1004, name: "Pham Gia Huy", department: "Engineering", email: "giahuy@example.com", status: "Active" },
  { id: 1005, name: "Vo Ngoc Linh", department: "Human Resources", email: "ngoclinh@example.com", status: "Active" },
  { id: 1006, name: "Dang Tuan Kiet", department: "Sales", email: "tuankiet@example.com", status: "Inactive" },
  { id: 1007, name: "Bui Khanh Vy", department: "Marketing", email: "khanhvy@example.com", status: "Active" },
  { id: 1008, name: "Do Hoang Nam", department: "Engineering", email: "hoangnam@example.com", status: "Active" },
  { id: 1009, name: "Huynh My Duyen", department: "Finance", email: "myduyen@example.com", status: "Inactive" },
  { id: 1010, name: "Phan Thanh Tung", department: "Sales", email: "thanhtung@example.com", status: "Active" },
  { id: 1011, name: "Nguyen Bao Tram", department: "Human Resources", email: "baotram@example.com", status: "Active" },
  { id: 1012, name: "Truong Duc Thinh", department: "Engineering", email: "ducthinh@example.com", status: "Inactive" },
  { id: 1013, name: "Mai Phuong Thao", department: "Marketing", email: "phuongthao@example.com", status: "Active" },
  { id: 1014, name: "Cao Anh Tuan", department: "Finance", email: "anhtuan@example.com", status: "Active" },
  { id: 1015, name: "Ngo Thi Kim", department: "Sales", email: "thikim@example.com", status: "Inactive" },
  { id: 1016, name: "Ly Quang Vinh", department: "Engineering", email: "quangvinh@example.com", status: "Active" },
  { id: 1017, name: "Hoang Yen Nhi", department: "Human Resources", email: "yennhi@example.com", status: "Active" },
  { id: 1018, name: "Vu Thanh Phong", department: "Sales", email: "thanhphong@example.com", status: "Inactive" },
  { id: 1019, name: "Dinh Ngoc Chau", department: "Finance", email: "ngocchau@example.com", status: "Active" },
  { id: 1020, name: "Ta Minh Quan", department: "Marketing", email: "minhquan@example.com", status: "Active" }
];

const tableBody = document.getElementById("employee-table-body");
const searchInput = document.getElementById("search-input");
const pageSizeSelect = document.getElementById("page-size");
const resultCount = document.getElementById("result-count");
const pageInfo = document.getElementById("page-info");
const previousButton = document.getElementById("previous-page");
const nextButton = document.getElementById("next-page");
const sortButtons = document.querySelectorAll("[data-sort]");

let searchTerm = "";
let currentPage = 1;
let pageSize = Number(pageSizeSelect.value);
let sortColumn = "id";
let sortDirection = "ascending";

function getFilteredEmployees() {
  const filtered = employees.filter((employee) => {
    const searchableText = [
      employee.id,
      employee.name,
      employee.department,
      employee.email,
      employee.status
    ].join(" ").toLowerCase();

    return searchableText.includes(searchTerm);
  });

  filtered.sort((a, b) => {
    const first = a[sortColumn];
    const second = b[sortColumn];

    let comparison;

    if (typeof first === "number") {
      comparison = first - second;
    } else {
      comparison = String(first).localeCompare(String(second));
    }

    return sortDirection === "ascending" ? comparison : -comparison;
  });

  return filtered;
}

function renderTable() {
  const filtered = getFilteredEmployees();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const visibleEmployees = filtered.slice(startIndex, startIndex + pageSize);

  tableBody.replaceChildren();

  visibleEmployees.forEach((employee) => {
    const row = document.createElement("tr");

    const values = [
      employee.id,
      employee.name,
      employee.department,
      employee.email
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className =
      employee.status === "Active" ? "status status-active" : "status status-inactive";
    statusBadge.textContent = employee.status;
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    tableBody.appendChild(row);
  });

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.textContent = "No employees found. Try another search.";
    row.appendChild(cell);
    tableBody.appendChild(row);
  }

  resultCount.textContent =
    `${filtered.length} employee(s) found`;

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  previousButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;

  sortButtons.forEach((button) => {
    const heading = button.closest("th");
    const isCurrentColumn = button.dataset.sort === sortColumn;

    heading.setAttribute(
      "aria-sort",
      isCurrentColumn ? sortDirection : "none"
    );

    button.querySelector("span").textContent = isCurrentColumn
      ? (sortDirection === "ascending" ? "↑" : "↓")
      : "↕";
  });
}

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedColumn = button.dataset.sort;

    if (sortColumn === selectedColumn) {
      sortDirection =
        sortDirection === "ascending" ? "descending" : "ascending";
    } else {
      sortColumn = selectedColumn;
      sortDirection = "ascending";
    }

    currentPage = 1;
    renderTable();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  currentPage = 1;
  renderTable();
});

pageSizeSelect.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value);
  currentPage = 1;
  renderTable();
});

previousButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextButton.addEventListener("click", () => {
  const totalPages = Math.max(
    1,
    Math.ceil(getFilteredEmployees().length / pageSize)
  );

  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
});

renderTable();