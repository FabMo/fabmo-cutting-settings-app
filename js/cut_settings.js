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

var variables = {}

updateStoredConfig(function (data) {
    var variables = data.opensbp.variables
    console.log(variables)
    populateToolLibrary();
    updateStatus();
    console.log("Machine Profile is " + data.engine.profile)
    var machineType = data.engine.profile
    if (machineType == 'ShopBot Desktop ATC') {
        document.getElementById('atcSetup').removeAttribute('hidden');
        document.getElementById('atcChangeSettings').removeAttribute('hidden');
    }
    if (machineType == 'ShopBot Desktop' || machineType == 'ShopBot Desktop Max') {
        document.getElementById('mtcChangeSettings').removeAttribute('hidden');
    }
    var imageDir = './files/' + machineType + '.jpg'
    console.log(imageDir)
    $('#machineImage1').attr('src', imageDir)
    $('#machineImage2').attr('src', imageDir)
    var variableInitCode = ''
    if (!variables['$sb_useZZeroLoc']) {
        variableInitCode += '$sb_useZZeroLoc = 0 \n '
    }
    if (!variables['$sb_zZeroLocX']) {
        variableInitCode += '$sb_zZeroLocX = 0 \n '
    }
    if (!variables['$sb_zZeroLocY']) {
        variableInitCode += '$sb_zZeroLocY = 0 \n '
    }
    if (!variables['$SB_HOMEOFF_X']) {
        variableInitCode += 'C201 \n '
    }
    if (variableInitCode != '') {
        fabmo.runSBP(variableInitCode);
    }
})

function updateStoredConfig(callback) {
    fabmo.getConfig(function (err, data) {
        if (err) {
            console.error(err)
        } else {
            $('[data-address]').each(function () {
                const address = $(this).data('address');
                console.log(address)
                const value = getValueByAddress(data, address);
                console.log(value)
                if (value !== undefined) {
                    $(this).val(value);
                }
            });
            console.log('updated vars')
            console.log(data.opensbp.variables)
            callback(data);
        }

    })
}

function getValueByAddress(obj, address) {
    return address.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
}

function updateStatus() {
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables
        console.log(variables)
        if (variables['ATC'] && variables['ATC']['TOOLIN']) {
            var toolIn = variables['ATC']['TOOLIN']
            var toolDescription = variables['TOOLS'][toolIn]['NAME']
            console.log('tooldesc = ' + toolDescription)
            if (toolDescription == undefined) { toolDescription = '' }
            var toolStatus = 'Tool Libary - Current Bit: ' + toolIn + '; ' + toolDescription
            $('#currentStatus').html(toolStatus)
        }
    })
}

function populateToolLibrary() {
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables
        console.log(variables)
        if (variables['TOOLS']) {
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
        } else {
        var row = `
        <tr>
            <td>0</td>
            <td><input class="tool-description" data-tool="0" type="text" value="Empty"></td>
            <td><a class="button radius small tool-load" style="padding:10px" data-tool="0">Load</a></td>
            <td><a class="button radius small tool-measure" style="padding:10px" data-tool="0">Measure</a></td>
        </tr>
        `;
                    $('#toolLibrary tbody').append(row);
        }
    })
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
    const $input = $(this);
    updateStoredConfig(function (data) {
        var variables = data.opensbp.variables
        console.log(variables)
        var toolNumber = $input.data('tool');
        var newDescription = escapeHtmlAttr($input.val())
        console.log('$TOOLS[' + toolNumber + '].NAME =' + newDescription)
        if (newDescription != undefined) {
            if (newDescription.length > 0) {
                var sbp = '$TOOLS[' + toolNumber + '].NAME = "' + newDescription + '" '
                if (!variables['TOOLS'][toolNumber]) {
                    sbp += '\n $TOOLS[' + toolNumber + '].H = -5.000'
                    sbp += '\n $TOOLS[' + toolNumber + '].X = 0'
                    sbp += '\n $TOOLS[' + toolNumber + '].Y = 0'
                    sbp += '\n $TOOLS[' + toolNumber + '].Z = 0'
                }
                fabmo.runSBP(sbp);
                $input.addClass("flash-green");
                setTimeout(function () { $input.removeClass("flash-green") }, 500);
                updateStatus()
            }
        } else {
            $input.addClass("flash-red");
            setTimeout(function () { $input.removeClass("flash-red") }, 500);
        }
    })
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

/// Show the popup bar when Add Tool is clicked
$('#addToolBtn').on('click', function () {
    $('#newToolNumber').val('');
    $('#toolPopupBar').slideDown();
    $('#newToolNumber').focus();
});

// Cancel the add
$('#cancelAddTool').on('click', function () {
    $('#toolPopupBar').slideUp();
});

// Confirm and add the tool row
$('#confirmAddTool').on('click', function () {
    const toolNumber = $('#newToolNumber').val().trim();
    console.log('adding tool number ' + toolNumber)
    if (toolNumber === '' || isNaN(toolNumber)) {
        console.log('tool number is NaN')
        alert('Please enter a valid tool number.');
        return;
    }

    // Check if tool number already exists
    if (variables.TOOLS && variables.TOOLS[toolNumber]) {
        console.log('tool number already exists')
        alert('A tool with this number already exists!');
        return;
    }

    // Append a new row with the specified tool number
    const newRow = `
    <tr>
      <td>${toolNumber}</td>
      <td><input class="tool-description" data-tool="${toolNumber}" type="text" value="Enter tool description..."></td>
      <td><a class="button radius small tool-load" style="padding:10px" data-tool="${toolNumber}">Load</a></td>
      <td><a class="button radius small tool-measure" style="padding:10px" data-tool="${toolNumber}">Measure</a></td>
    </tr>
  `;
    $('#toolLibrary tbody').append(newRow);
    console.log('row appended')
    $('#toolPopupBar').slideUp();
});

// Watch all input and checkbox elements EXCEPT inside #toolLibrary
$('input, select, textarea').not('#toolLibrary *').on('change', function () {
    const $input = $(this);

    // Get the data-address (if any)
    const address = $input.data('address') || '(no address)';

    let value;

    if ($input.attr('type') === 'checkbox') {
        value = $input.prop('checked') ? 1 : 0;
    } else {
        value = $input.val();
    }
    $input.addClass("flash-green");
    setTimeout(() => $input.removeClass("flash-green"), 500);
    console.log(`Changed input at [${address}]: ${value}`);

    // ⬇️ Call your own handler function here
    var varname = '$' + address.split('.')[address.split('.').length - 1]
    var sbp = varname + ' = ' + value
    console.log(sbp)

    fabmo.runSBP(varname + ' = ' + value, function(err, result){
        if (err) {
            console.error("SBP run failed:", err);
            fabmo.notify('error','settings changes not allowed while machine is in motion.')
        }else{
            console.log("SBP run completed. Result:", result);
            fabmo.notify('success', varname + ' updated to ' + value)
        }
        });
});

$('#sb_useZZeroLoc').on('change', function (e) {
    if ($('#sb_useZZeroLoc').prop('checked')) {
        console.log('trying to show fields...')
        $('#sb_zZeroLocX').prop('disabled', false);
        $('#sb_zZeroLocY').prop('disabled', false);
    } else {
        $('#sb_zZeroLocX').prop('disabled', true);
        $('#sb_zZeroLocY').prop('disabled', true);
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
    $.get('../files/offset.sbp', function (data) {
        var file = data.toString();
        fabmo.runSBP(file);
    })
});
