"""The pinned Overture release's buildings in the box, as one local parquet file (the public bucket, no account).
python -I scripts/village/fetch.py <source.json> <out.parquet>"""
import json
import sys

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as fs
import pyarrow.parquet as pq

BUCKET = 'overturemaps-us-west-2'
COLUMNS = ['geometry', 'bbox', 'sources']


def fail(message):
    sys.exit(f'FAIL: {message}')


def check_schema(schema):
    """The columns this build reads, in the shape it reads them; a change means the release must be looked at again."""
    missing = [c for c in COLUMNS if c not in schema.names]
    if missing:
        fail(f'the buildings schema lost {missing}')
    if not (pa.types.is_binary(schema.field('geometry').type) or pa.types.is_large_binary(schema.field('geometry').type)):
        fail(f'geometry is {schema.field("geometry").type}, not WKB')
    box, sources = schema.field('bbox').type, schema.field('sources').type
    if not pa.types.is_struct(box) or {f.name for f in box} != {'xmin', 'xmax', 'ymin', 'ymax'}:
        fail(f'bbox is {box}')
    if not (pa.types.is_list(sources) and pa.types.is_struct(sources.value_type)):
        fail(f'sources is {sources}')
    if not {'dataset', 'property'} <= {f.name for f in sources.value_type}:
        fail(f'sources holds {sources.value_type}')


def main():
    source, out = sys.argv[1:]
    with open(source, encoding='utf8') as file:
        pin = json.load(file)
    path = f'{BUCKET}/release/{pin["release"]}/theme=buildings/type=building'
    s3 = fs.S3FileSystem(anonymous=True, region='us-west-2')
    if s3.get_file_info(path).type == fs.FileType.NotFound:
        fail(f'Overture release {pin["release"]} is gone (releases are kept 60 days). Pin a newer one in source.json, '
             'check its changelog, and set "expected" from a measuring run.')
    data = ds.dataset(path, filesystem=s3, format='parquet', partitioning=None)
    check_schema(data.schema)
    w, s, e, n = pin['box']
    at = lambda name: pc.field('bbox', name)
    inside = (at('xmin') < e) & (at('xmax') > w) & (at('ymin') < n) & (at('ymax') > s)
    table = data.to_table(columns=COLUMNS, filter=inside)
    pq.write_table(table, out, compression='zstd')
    print(f'release {pin["release"]}: {table.num_rows} buildings in the box')


main()
