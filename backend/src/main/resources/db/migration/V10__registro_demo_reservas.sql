-- Identity belongs to the dataset, independently of the account running the command.
create table aulas.demo_reserva (
    dataset text not null,
    clave text not null,
    version_dataset integer not null check (version_dataset > 0),
    id_reserva bigint not null unique references aulas.reserva(id_reserva),
    definicion jsonb not null,
    snapshot jsonb not null,
    creada_en timestamptz not null default now(),
    primary key(dataset,clave)
);
revoke all on aulas.demo_reserva from public;
