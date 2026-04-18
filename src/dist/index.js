export {};
console.log("Hello, World!");
let name = "Press";
let age = 22;
console.log(`My name is ${name} and I am ${age} years old.`);
const button = document.getElementById("myButton");
//button.addEventListener("click", () => {
//    alert("Button clicked!");
//    });
let workers;
let worker1 = { id: 1, name: 'Preston', position: 'tech' };
console.log(worker1);
workers = { id: 13, name: 'Junpei', position: 'gooner' };
console.log(workers);
let worker2 = { id: 2, name: 'Alice', position: 'manager' };
console.log(worker2);
workers = { id: 14, name: 'Bobly', position: 'lover' };
console.log(Worker);
class User {
    constructor() {
        this.name = "Press";
    }
    sayHi(name) {
        // this.name is the class property ("Press")
        // name is the function argument
        console.log(`Class property: ${this.name}, Local argument: ${name}`);
    }
}
let user = new User();
user.sayHi('Preston');
//# sourceMappingURL=index.js.map