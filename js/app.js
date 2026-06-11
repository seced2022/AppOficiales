function toggleSidebar(){
    document.body.classList.toggle("sidebar-mini");
}

function openModal(id){
    document.getElementById(id).classList.add("show");
}

function closeModal(id){
    document.getElementById(id).classList.remove("show");
}

document.addEventListener("click", function(e){
    if(e.target.classList.contains("modal")){
        e.target.classList.remove("show");
    }
});
