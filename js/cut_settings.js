document.addEventListener("DOMContentLoaded", function () {
    // Get all tab links
    const navLinks = document.querySelectorAll("nav ul.left li a");
    const tabContents = document.querySelectorAll(".tabs-content .content");

    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent default anchor behavior

            // Remove active class from all tabs
            navLinks.forEach(item => item.parentElement.classList.remove("active"));
            tabContents.forEach(content => content.style.display = "none");

            // Add active class to the clicked tab
            this.parentElement.classList.add("active");

            // Show the corresponding content
            const targetId = this.getAttribute("href").substring(1); // Get the ID without #
            document.getElementById(targetId).style.display = "block";
        });
    });

    // Set the default active tab
    document.querySelector("nav ul.left li.active a").click();
});

var fabmo = new FabMoDashboard();

fabmo.getConfig(function (err, data) {
    if (err) {
        console.error(err)
    } else {
        $('[data-address]').each(function () {
            const address = $(this).data('address');
            const value = getValueByAddress(data, address);
            if (value !== undefined) {
                $(this).val(value);
            }
        });
        var variables = data.opensbp.variables;
        populateToolLibrary(variables);
        updateStatus(variables);
        console.log("Machine Profile is " + data.engine.profile)
        var machineType = data.engine.profile

        var imageDir = './files/' + machineType + '.jpg'
        console.log (imageDir)
        $('#machineImage1').attr('src', imageDir)
        $('#machineImage2').attr('src', imageDir)
    }
})

function getValueByAddress(obj, address) {
    return address.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
}

function updateStatus(variables) {
    if (variables['ATC']['TOOLIN']) {
        var toolIn = variables['ATC']['TOOLIN']
        var toolDescription = variables['TOOLS'][toolIn]['NAME']
        console.log('tooldesc = ' + toolDescription)
        if (toolDescription == undefined) { toolDescription = '' }
        var toolStatus = 'Bit Loaded: ' + toolIn + '<br>' + toolDescription
        $('#currentStatus').html(toolStatus)
    }
}

function populateToolLibrary(variables) {
    console.log(variables)
    if(variables['TOOLS']){
    $.each(variables['TOOLS'], function (toolNumber, toolData) {
        var safeValue = escapeHtmlAttr(toolData.NAME) || '';
        if (safeValue == 'undefined') { safeValue = 'Enter Tool Description...' }
        if (toolNumber == 0) { safeValue = 'Empty' }
        var row = `
    <tr>
        <td>${toolNumber}</td>
        <td><input class="tool-description" data-tool="${toolNumber}" type="text" value="${safeValue}"></td>
        <td><a class="button radius small tool-load" style="padding:10px" data-tool="${toolNumber}">Load</a></td>
        <td><a class="button radius small tool-measure" style="padding:10px" data-tool="${toolNumber}">Measure</a></td>
    </tr>
    `;
        $('#toolLibrary tbody').append(row);
    });
}
}

function escapeHtmlAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

$('#toolLibrary').on('change', '.tool-description', function (e) {
    var toolNumber = $(this).data('tool');
    var newDescription = escapeHtmlAttr($(this).val())
    console.log('$TOOLS[' + toolNumber + '].NAME =' + newDescription)
    if (newDescription != undefined){
        if(newDescription.length > 0){
    fabmo.runSBP('$TOOLS[' + toolNumber + '].NAME = "' + newDescription + '"');
    $(this).addClass("flash-green");
    setTimeout(function () { $(this).removeClass("flash-green") }, 500);
    updateStatus()}} else {
        $(this).addClass("flash-red");
    setTimeout(function () { $(this).removeClass("flash-red") }, 500);
    }
});

$('#toolLibrary').on('click', '.tool-load', function () {
    var toolNumber = $(this).data('tool');
    console.log('running &tool = ' + toolNumber + ' \n C9')
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C9');
});

$('#toolLibrary').on('click', '.tool-measure', function () {
    var toolNumber = $(this).data('tool');
    console.log('running &tool = ' + toolNumber + ' \n C72')
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C72');
});

$('#fixedZZLoc').on('change', function (e) {
    if ($('#fixedZZLoc').prop('checked')) {
        $('#zzXLoc').prop('disabled', false);
        $('#zzYLoc').prop('disabled', false);
    } else {
        $('#zzXLoc').prop('disabled', true);
        $('#zzYLoc').prop('disabled', true);
    }
})

$('#xOffset').on('change', function (e) {
    $('#xOffset').addClass("flash-green");
    setTimeout(function () { $('#xOffset').removeClass("flash-green") }, 500);
})

$('#btn-HomeMachine').click(function () {
    fabmo.runSBP('C3');
});

$('#btn-ZeroZ').click(function () {
    fabmo.runSBP('C2');
});

$('#btn-Warmup').click(function () {
    fabmo.runSBP('C5');
});

$('#btn-SquareGnt').click(function () {
    fabmo.runSBP('C10');
});

$('#btn-MeasureBits').click(function () {
    fabmo.runSBP('&tool = 0 \n C72');
});

$('#btn-PlateOffset').click(function () {
    fabmo.runSBP('C73');
});

$('#btn-CalibrateToolbar').click(function () {
    fabmo.runSBP('C74');
});

$('.panel-block').click(function () {
    var clicked = $(this).attr('id');
    $('.' + clicked).show();
    $('.panel').hide();
});

$('.delete').click(function () {
    $('.section').hide();
    $('.panel').show();
});

$('#btn-setHome').click(function () {
    $.get('./files/offset.sbp', function (data) {
        var file = data.toString();
        fabmo.runSBP(file);
    })
});
