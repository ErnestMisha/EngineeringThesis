async function sendRequest(element, address, data) {
    const req = await fetch(location + '/' + address, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data ? `id=${element.dataset.id }` : null
        });
    if(req.status === 200) {   
        const info = document.getElementById(element.dataset.id);
        if(info.textContent === 'TAK') {
            info.textContent = 'NIE';
            info.className = 'text-red-500';
        }
        else {
            info.textContent = 'TAK';
            info.className = 'text-green-500';
        }
    }
    else {
        const alert = document.createElement('div');
        const content = document.createTextNode('Wystąpił nieoczekiwany problem, spróbuj później');
        alert.appendChild(content);
        alert.className = 'fixed top-0 left-1/4 w-1/2 m-2 p-2 border-4 border-red-500 bg-red-400 rounded-xl text-2xl text-center';
        document.body.appendChild(alert);
        setTimeout(() => {
            alert.className = 'hidden';
        }, 5000);
    }
}

function changeText(elem, id) {
    document.getElementById(id).textContent = elem.files[0].name;
}