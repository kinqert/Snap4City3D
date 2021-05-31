var map;
const datasetName = 'Florence_PM10';
// const wmsUrlTest = 'https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AFlorence_PM10&styles=&format=image%2Fpng&transparent=true&version=1.1.1&time=2021-03-05T10:00:00.000Z&tiled=true&width=512&height=512&srs=EPSG%3A4326/{z}/{x}/{y}'
// const wms = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AFlorence_PM10&styles=&format=image%2Fpng&version=1.1.1&tiled=true&width=256&height=256&srs=EPSG%3A4326/{z}/{x}/{y}`
// const wms3 = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3A' + wmsDatasetName + '&styles=&format=image%2Fpng&version=1.1.1&time=' + timestampISO + '&tiled=true&width=' + tileSize + '&height=' + tileSize + '&srs=EPSG%3A4326/{z}/{x}/{y}'`;
// const wms4 = `https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3AGRALheatmap&styles=&format=image%2Fpng&version=1.1.1&time=2021-05-28T07:00:00.000Z&tiled=true&width=256&height=256&srs=EPSG%3A4326/{z}/{x}/{y}`;
const wms = 'https://wmsserver.snap4city.org/geoserver/Snap4City/wms?service=WMS&request=GetMap&layers=Snap4City%3APM10Average24HourFlorence&styles=&format=image%2Fpng&transparent=true&version=1.1.1&time=2020-01-15T20:00:00.000Z&tiled=true&width=512&height=512&srs=EPSG%3A4326';
var darkmode = false;
const darkTileData = 'https://a.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=a120aa4adf4b4f92b72805b73035890a';
const lightTileData = 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png';
const cortiBuidlingData = 'http://127.0.0.1:5500/src/data/edificiFirenze.geojson';
const osmBuildingsData = 'https://{s}.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json';
var layers;
var markers = [];

const florencePosition = {
    latitude: 43.769562,
    longitude: 11.255814,
};

class Road {
    constructor(json) {
        this.name = json.road;
        this.segments = json.segments;
    }
}

function onLoad() {
    const mapLayer = createTileLayer(lightTileData);
    const buildingLayer = createBuildingLayer(cortiBuidlingData);
    const heatmapLayer = createHeatmapLayer(wms);
    layers = {
        map: mapLayer,
        heatmap: heatmapLayer,
        building: buildingLayer,
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
            buildingLayer
        ],
        onViewStateChange: ({ viewState }) => {
            const maxbb = getMaxBoundingBox(viewState);
            console.log('new max bbox:');
            url = `https://firenzetraffic.km4city.org/trafficRTDetails/roads/read.php?sLat=${maxbb[0][1]}&sLong=${maxbb[0][0]}&eLat=${maxbb[1][1]}&eLong=${maxbb[1][0]}&zoom=15`;
            console.log(maxbb);
            $.ajax({
                url: url,
                success: function (result) {
                    console.log('ajax success result:');
                    console.log(result);
                    const pathLayer = createPathLayer(result, `path-layer-${Date.now()}`);
                    layers.path = pathLayer;
                    updateLayers();
                },
            });
            map.setProps({
                viewState: viewState,
            });
            return viewState;
        },
    });

    addEventListeners();
}

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

function createHeatmapLayer(data, id = 'heatmap-layer') {
    return new deck.TileLayer({
        id: id,
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers

        minZoom: 0,
        maxZoom: 20,
        tileSize: 512,
        opacity: 0.2,
        pickable: true,

        renderSubLayers: props => {
            const {
                bbox: { west, south, east, north }
            } = props.tile;

            return new deck.BitmapLayer(props, {
                data: null,
                image: wms + `&bbox=${west},${south},${east},${north}`,
                bounds: [west, south, east, north]
            });
        },
        onClick: (info, event) => addMarker(info.coordinate),

    });

}

function createBuildingLayer(data, id = 'building-layer') {
    return new deck.GeoJsonLayer({
        id: id,
        data: data,
        extruded: true,
        pickable: true,
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


function createIconLayer(id = 'icon-layer') {
    const ICON_MAPPING = {
        marker: { x: 0, y: 0, width: 128, height: 128, mask: true }
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

function createLineLayer(data, id = 'line-layer') {
    var segments = [];
    for (var i = 1; i < data.length; i++)
        segments.push(...(data[i].segments));
    return new deck.LineLayer({
        id: id,
        data: [data[1].segments[0]],
        // pickable: true,
        getWidth: 50,
        getSourcePosition: d => [d.start.lat, d.start.long],
        getTargetPosition: d => [d.end.long, d.end.lat],
        getColor: d => [0, 0, 255],
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

function changeMapTiles() {
    darkmode = !darkmode;
    const mapLayer = darkmode ? createTileLayer(darkTileData) : createTileLayer(lightTileData);
    layers.map = mapLayer;

    updateLayers();
    updateTheme();
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

function updateLayers() {
    map.setProps({
        layers: [
            layers.map,
            layers.heatmap,
            layers.building,
            layers.icon,
            layers.path,
        ]
    })
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
    const ne = viewport.unproject([0, viewport.height]);
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
}

window.onload = onLoad;