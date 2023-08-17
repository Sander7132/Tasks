Cypress.on("uncaught:exception", (err, runnable) => {
  return false;
});

describe("template spec", () => {
  it("passes", () => {
    cy.visit("http://localhost:3000");
  });
});

//Sign in with correct email and password

describe("Sign in with correct email and password", () => {
  it("Should log in with correct email and password", () => {
    cy.visit("http://localhost:3000");
    cy.get("button[name=signin]").click();
    cy.get("input[name=email]").type("admin");
    cy.get("input[name=password]").type("KollneKollne");
    cy.get("button[name=login]").click();
    // cy.get("div[id=error]").should("contain", "Invalid email");
  });
});

//Add a task

describe("Add a task", () => {
  it("Should add a task", () => {
    cy.visit("http://localhost:3000");
    cy.get("button[name=signin]").click();
    cy.get("input[name=email]").type("admin");
    cy.wait(2000);
    cy.get("input[name=password]").type("KollneKollne");
    cy.wait(2000);
    cy.get("button[name=login]").click();
    cy.get("button[name=addtaskbutton]").click();
    cy.wait(2000);
    cy.get("input[name=tiitel]").type("test123");
    cy.wait(2000);
    cy.get("textarea[name=content]").type("test123");
    cy.get("button[name=addtaskmodal]").click();
    cy.visit("http://localhost:3000");
    //cy.get("div[id=error]").should("contain", "Test");
  });
});
