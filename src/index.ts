export {};
console.log("Hello, World!");

let name: string = "Press";
let age :number= 22;

console.log(`My name is ${name} and I am ${age} years old.`);

const button = document.getElementById("myButton") as HTMLButtonElement;
    
//button.addEventListener("click", () => {
//    alert("Button clicked!");
//    });

let workers :{
    id:number,
    name:string,
    position:string
} 

interface Worker{
    id:number,
    name:string,
    position:string
} 

let worker1:Worker={id:1,name:'Preston',position:'tech'}
console.log(worker1)
workers ={id:13,name:'Junpei',position:'gooner'}
console.log(workers)
let worker2:Worker={id:2,name:'Alice',position:'manager'}
console.log(worker2)
workers={id:14,name:'Bobly',position:'lover'}
console.log(Worker)

type Draggable ={
    drag:()=>void
}
type Resizable ={
    resize:()=> void
}

type UIWidget = Draggable & Resizable

class User {
  name: string = "Press";

  sayHi(name: string) {
    // this.name is the class property ("Press")
    // name is the function argument
    console.log(`Class property: ${this.name}, Local argument: ${name}`);
  }
 
}
let user = new User();

user.sayHi('Preston');