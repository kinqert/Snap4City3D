var map;
const datasetName = 'Florence_PM10';
const wms = 'https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3APM10Average24HourFlorence&styles=&format=image%2Fpng&transparent=true&version=1.1.1&time=2020-01-15T20:00:00.000Z&tiled=true&width=512&height=512&srs=EPSG%3A4326';
const wmsTraffic = 'https://wmsserver.snap4city.org/geoserver/wms?service=WMS&request=GetMap&layers=Firenze_TrafficRealtime_2021-06-22T15-41-00&styles=&format=image%2Fpng&transparent=true&version=1.1.1&width=256&height=256&srs=EPSG%3A4326';
const wmsTerrain = 'https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3ATuscanyDTM1&styles=&format=image%2Fpng&transparent=true&version=1.1.1&time=2021-06-22T10%3A00%3A00.000Z&tiled=true&width=256&height=256&srs=EPSG%3A4326';
var darkmode = false;
var buildingOsm = false;
var dragging = false;
var ajaxCall;
const darkTileData = 'https://a.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=a120aa4adf4b4f92b72805b73035890a';
const lightTileData = 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png';
const cortiBuidlingData = 'http://127.0.0.1:5500/src/data/edificiFirenze.geojson';
const osmBuildingsData = 'https://b.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json';
const testCyclingPath = 'https://servicemap.disit.org/WebAppGrafo/api/v1/?queryId=10916300fca38e05e03096daa0418a13&format=json&selection=wkt:POLYGON((11.225590994714041%2043.76180889340632,%2011.27680900528596%2043.76180889340632,%2011.289249734546418%2043.788121029543056,%2011.213150265453583%2043.788121029543056))&maxResults=0&geometry=true&fullCount=false';
var layers;
var markers = [];
var opacityWms = 0.2;

const florencePosition = {
    latitude: 43.769562,
    longitude: 11.255814,
};

function onLoad() {
    //loaders.registerLoaders(loaders.TerrainLoader);
    const mapLayer = createTileLayer(lightTileData);
    //const mapLayer = createTerrainTileLayer(wmsTerrain, lightTileData);

    const buildingLayer = createBuildingLayer(cortiBuidlingData);
    // const buildingLayer = createOsmBuildingLayer(wmsTerrain, lightTileData);
    const heatmapLayer = createHeatmapLayer(wms, 'heatmap-layer', 512, opacityWms);
    const trafficLayer = createHeatmapLayer(wmsTraffic, "traffic-layer", 256, 1);
    layers = {
        map: mapLayer,
        //heatmap: heatmapLayer,
        //traffic: trafficLayer,
        //building: buildingLayer,
    };

    map = new deck.DeckGL({
        mapStyle: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
        viewState: {
            ...florencePosition,
            zoom: 15
        },
        controller: true,
        container: 'map',
        layers: [
            mapLayer,
            heatmapLayer,
            //trafficLayer,
            //buildingLayer
        ],
        onViewStateChange: ({ viewState }) => {
            if (!dragging) {
                //updateTraffic(viewState);
                //updateSensorSite(viewState);
                // updateCyclingPath(viewState);
                //updateLayers();
            }
            map.setProps({
                viewState: viewState,
            });
            return viewState;
        },
        getTooltip: ({ object }) => object && {
            html: `<h2>${object.name}</h2>`,
        },
        onDragEnd: ({ viewport }) => dragging = false,
        onDragStart: ({ viewport }) => dragging = true,
    });

    addEventListeners();
}

// Layers section
function createTileLayer(data, id = 'map-layer') {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
        data: data,

        minZoom: 0,
        maxZoom: 20,
        tileSize: 256,
        opacity: 1,
        pickable: true,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north]
            });
        },
        onClick: (info, event) => addMarker(info.coordinate),

    });

}

function createTerrainTileLayer(url, data, id = 'terrain-layer') {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
        data: data,

        minZoom: 0,
        maxZoom: 20,
        tileSize: 256,
        opacity: 1,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.TerrainLayer({
                id: props.id,
                elevationDecoder: {
                    rScaler: 1,
                    gScaler: 0,
                    bScaler: 0,
                    offset: -10
                },
                opacity: 1,
                elevationData: url + `&bbox=${west},${south},${east},${north}`,
                //texture: data + `&bbox=${west},${south},${east},${north}`,
                texture: props.data,
                //texture: data,
                bounds: [west, south, east, north],
                //loaders: [loaders.TerrainLoader],
                //renderSubLayers: props => {
                    //return createBuildingLayer(cortiBuidlingData);
                //},
                
            });
        },
    });

}

function createTerrainLayer(url, data, id = 'terrain-layer') {
    return new deck.TerrainLayer(props, {
        id: id,
        
        elevationData: url + `&bbox=${west},${south},${east},${north}`,
        //texture: data + `&bbox=${west},${south},${east},${north}`,
        texture: props.data,
        bounds: [west, south, east, north]

    });
}

function createHeatmapLayer(url, id = 'heatmap-layer', tileSize = 512, opacity = 0.2) {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers

        minZoom: 0,
        maxZoom: 20,
        tileSize: tileSize,
        opacity: opacity,
        pickable: true,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.BitmapLayer(props, {
                data: null,
                image: url + `&bbox=${west},${south},${east},${north}`,
                bounds: [west, south, east, north]
            });
        },
        onClick: (info, event) => addMarker(info.coordinate),

    });

}

function createGeoJSONLayer(data, id = "geojson-layer") {
    return new deck.GeoJsonLayer({
        id: id,
        data: data,
        extruded: true,
        // pickable: true,
        stroked: true,
        filled: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [255, 0, 0, 200],
        getLineColor: [0, 0, 255],
        getRadius: 100,
        getLineWidth: 1,
    });
}

function createWktLayer(data, id = "wkt-layer") {
    return new deck.GeoJsonLayer({
        id: id,
        data: data,
        loaders: [WKTLoader],
        stroked: true,
        filled: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [255, 0, 0, 200],
        getLineColor: [0, 0, 255],
        getRadius: 100,
        getLineWidth: 1,
    });
}

function createBuildingLayer(data, id = 'building-layer') {
    return new deck.GeoJsonLayer({
        id: id,
        data: data,
        extruded: true,
        // pickable: true,
        stroked: false,
        filled: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [255, 102, 0, 200],
        getLineColor: [255, 255, 255],
        getElevation: f => f.properties.height,
        getRadius: 100,
        getLineWidth: 1,
    });
}

function createOsmBuildingLayer(id = "osm-building-layer") {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
        data: osmBuildingsData,

        minZoom: 0,
        maxZoom: 20,
        tileSize: 256,
        opacity: 1,
        // pickable: true,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.GeoJsonLayer({
                id: id,
                data: props.data,
                extruded: true,
                // pickable: true,
                stroked: false,
                filled: true,
                lineWidthScale: 20,
                lineWidthMinPixels: 2,
                getFillColor: [255, 102, 0, 200],
                getLineColor: [255, 255, 255],
                getElevation: f => f.properties.height || f.properties.levels || 10,
                getRadius: 100,
                getLineWidth: 1,
            });
        },
        onClick: (info, event) => addMarker(info.coordinate),

    });
}


function createIconLayer(id = 'icon-layer') {
    const ICON_MAPPING = {
        marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
        warningMarker: { x: 128, y: 0, width: 128, height: 128, mask: true },
    };

    return new deck.IconLayer({
        id: id,
        data: markers,
        pickable: true,
        iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
        iconMapping: ICON_MAPPING,
        getIcon: d => 'marker',

        sizeScale: 15,
        getPosition: d => d.coordinates,
        getSize: d => 5,
        getColor: d => d.color,
        parameters: {
            depthTest: false
        },
    });
}

function createSensorLayer(data, id = 'sensor-layer') {
    const ICON_MAPPING = {
        sensor: { x: 0, y: 0, width: 32, height: 37 },
    };

    return new deck.IconLayer({
        id: id,
        data: data,
        pickable: true,
        iconAtlas: 'https://www.snap4city.org/dashboardSmartCity/img/gisMapIcons/TransferServiceAndRenting_SensorSite.png',
        iconMapping: ICON_MAPPING,
        getIcon: d => 'sensor',

        sizeScale: 15,
        getPosition: d => d.geometry.coordinates,
        getSize: d => 5,
        parameters: {
            depthTest: false
        },
    });

}

function createLineLayer(data, id = 'line-layer') {
    var segments = [];
    for (var i = 1; i < data.length; i++)
        segments.push(...(data[i].segments));
    return new deck.LineLayer({
        id: id,
        data: segments,
        // pickable: true,
        getWidth: 10,
        getSourcePosition: d => [parseFloat(d.start.long), parseFloat(d.start.lat)],
        getTargetPosition: d => [parseFloat(d.end.long), parseFloat(d.end.lat)],
        getColor: d => d.color || [0, 0, 255],
    });
}

function createPathLayer(data, id = 'path-layer') {
    return new deck.PathLayer({
        id: id,
        data: data,
        getPath: d => {
            var path = [];
            for (var i = 0; i < d.segments.length; i++) {
                path.push([parseFloat(d.segments[i].start.long), parseFloat(d.segments[i].start.lat)]);
                path.push([parseFloat(d.segments[i].end.long), parseFloat(d.segments[i].end.lat)]);
            }
            return path;
        },
        getColor: d => [0, 0, 255],
        getWidth: d => 10,
    });
}

function addMarker(coordinate) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);

    markers.push({
        name: `marker-${markers.length}`,
        coordinates: coordinate,
        color: [r, g, b],
    });

    const iconLayer = createIconLayer(`icon-layer-${markers.length}`);
    layers.icon = iconLayer;

    updateLayers();
}

function updateTraffic(viewState) {
    const maxbb = getMaxBoundingBox(viewState);
    urlRoads = `https://firenzetraffic.km4city.org/trafficRTDetails/roads/read.php?sLat=${maxbb[0][1]}&sLong=${maxbb[0][0]}&eLat=${maxbb[1][1]}&eLong=${maxbb[1][0]}&zoom=15`;
    urlDensity = `https://firenzetraffic.km4city.org/trafficRTDetails/density/read.php?sLat=${maxbb[0][1]}&sLong=${maxbb[0][0]}&eLat=${maxbb[1][1]}&eLong=${maxbb[1][0]}&zoom=15`;
    if (ajaxCall != null) {
        ajaxCall.abort();
        ajaxCall = null;
    }
    ajaxCall = $.ajax({
        url: urlRoads,
        success: function (result) {
            ajaxCall = null;
            addDensity(urlDensity, result);
        },
    });
}

function addDensity(urlDensity, roads) {
    $.ajax({
        url: urlDensity,
        success: function (result) {
            console.log('ajax density success result:');
            console.log(result);

            // Removing first null object
            if (roads[0].road == null)
                roads = roads.slice(1);

            // For all roads
            for (var i = 0; i < roads.length; i++) {
                var road = roads[i];
                var density = result[road.road];
                // for all segments
                for (var j = 0; j < road.segments.length; j++) {
                    var segment = road.segments[j];
                    var segmentDensity = density.data[0][segment.id];
                    segment.density = segmentDensity;
                    segment.color = getOldDensityColor(segment);
                }
            }

            const lineLayer = createLineLayer(roads, `line-layer-${Date.now()}`);
            layers.line = lineLayer;
        },
    });
}

function updateCyclingPath(viewState) {
    const queryId = '10916300fca38e05e03096daa0418a13';
    const cyclingPath = getWebAppGrafoPath(queryId, viewState);

    const cyclingLayer = createWktLayer(cyclingPath);
    layers.cycling = cyclingLayer;
}

function updateSensorSite(viewState) {
    const queryId = '76e0be36369db8598c6573716e84ae6c';
    const sensorPath = getWebAppGrafoPath(queryId, viewState);

    $.ajax({
        url: sensorPath,
        success: function (result) {

            const sensorLayer = createSensorLayer(result.SensorSites.features);
            layers.sensors = sensorLayer;
            updateLayers();
        },
    });
}

function updateLayers() {
    map.setProps({
        layers: [
            layers.map,
            layers.heatmap,
            layers.traffic,
            layers.building,
            layers.line,
            layers.path,
            layers.cycling,
            layers.icon,
            layers.sensors,
        ]
    })
}

function getWebAppGrafoPath(queryId, viewState) {
    const bb = getBoundingBox(viewState);
    var testCyclingPath = `https://servicemap.disit.org/WebAppGrafo/api/v1/?queryId=${queryId}&format=json`;
    testCyclingPath += "&selection=wkt:POLYGON((";
    testCyclingPath += `${bb[0][0]}%20${bb[0][1]}`;
    for (var i = 1; i < bb.length; i++) {
        testCyclingPath += `,%20${bb[i][0]}%20${bb[i][1]}`;
    }
    testCyclingPath += "))&maxResults=0&geometry=true&fullCount=false";
    return testCyclingPath;
}

function getMaxBoundingBox(viewState) {
    const bb = getBoundingBox(viewState);
    var minLat = bb[0][0];
    var maxLat = bb[0][0];
    var minLng = bb[0][1];
    var maxLng = bb[0][1];
    for (var i = 1; i < bb.length; i++) {
        if (minLat > bb[i][0])
            minLat = bb[i][0];
        if (maxLat < bb[i][0])
            maxLat = bb[i][0];
        if (minLng > bb[i][1])
            minLng = bb[i][1];
        if (maxLng < bb[i][1])
            maxLng = bb[i][1];
    }
    return [[minLat, minLng], [maxLat, maxLng]];
}

function getBoundingBox(viewState) {
    const viewport = new deck.WebMercatorViewport(viewState);
    const nw = viewport.unproject([0, 0]);
    const ne = viewport.unproject([viewport.width, 0]);
    const se = viewport.unproject([viewport.width, viewport.height]);
    const sw = viewport.unproject([0, viewport.height]);
    return [nw, ne, se, sw];
}

function updateTheme() {
    const removeClass = darkmode ? 'light-btn' : 'dark-btn';
    const addClass = darkmode ? 'dark-btn' : 'light-btn';
    $('button').removeClass(removeClass);
    $('button').addClass(addClass);
}

function addEventListeners() {
    $('#changeMapBtn').on('click', changeMapTiles);
    $('#changeBuildingBtn').on('click', changeBuildingLayer);
}

function getOldDensityColor(segment) {
    var green = 0.3;
    var yellow = 0.6;
    var orange = 0.9;
    if (segment.Lanes == 2) {
        green = 0.6;
        yellow = 1.2;
        orange = 1.8;
    }
    if (segment.FIPILI == 1) {
        green = 0.25;
        yellow = 0.5;
        orange = 0.75;
    }
    if (segment.Lanes == 3) {
        green = 0.9;
        yellow = 1.5;
        orange = 2;
    }
    if (segment.Lanes == 4) {
        green = 1.2;
        yellow = 1.6;
        orange = 2;
    }
    if (segment.Lanes == 5) {
        green = 1.6;
        yellow = 2;
        orange = 2.4;
    }
    if (segment.Lanes == 6) {
        green = 2;
        yellow = 2.4;
        orange = 2.8;
    }
    if (segment.density <= green)
        return [0, 255, 0];
    else if (segment.density <= yellow)
        return [255, 255, 0];
    else if (segment.density <= orange)
        return [255, 140, 0];
    else
        return [255, 0, 0];
}

function changeMapTiles() {
    darkmode = !darkmode;
    const mapLayer = darkmode ? createTileLayer(darkTileData) : createTileLayer(lightTileData);
    layers.map = mapLayer;

    updateLayers();
    updateTheme();
}

function changeBuildingLayer() {
    buildingOsm = !buildingOsm;
    var buildingLayer;
    if (buildingOsm)
        buildingLayer = createOsmBuildingLayer();
    else
        buildingLayer = createBuildingLayer(cortiBuidlingData);
    layers.building = buildingLayer;
    updateLayers();
}

window.onload = onLoad;
