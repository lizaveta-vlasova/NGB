CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_DATABASE START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_DATABASE (
    DATABASE_ID BIGINT NOT NULL PRIMARY KEY,
    NAME VARCHAR(500) NOT NULL,
    PATH VARCHAR NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_GROUP START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_GROUP (
    GROUP_ID BIGINT NOT NULL PRIMARY KEY,
    PRIMARY_GENE_ID BIGINT NOT NULL,
    PRIMARY_GENE_TAX_ID BIGINT NOT NULL,
    TYPE BIGINT NOT NULL,
    DATABASE_ID BIGINT NOT NULL,
    CONSTRAINT group_database_id_fkey FOREIGN KEY (DATABASE_ID) REFERENCES CATGENOME.HOMOLOG_DATABASE(DATABASE_ID)
);

CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_GROUP_GENE START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_GROUP_GENE (
    GROUP_GENE_ID BIGINT NOT NULL PRIMARY KEY,
    GROUP_ID BIGINT NOT NULL,
    GENE_ID BIGINT NOT NULL,
    TAX_ID BIGINT NOT NULL,
    DATABASE_ID BIGINT NOT NULL,
    CONSTRAINT group_id_fkey FOREIGN KEY (GROUP_ID) REFERENCES CATGENOME.HOMOLOG_GROUP(GROUP_ID)
);
CREATE INDEX CATGENOME.HOMOLOG_GROUP_GENE_GENE_ID_IDX ON CATGENOME.HOMOLOG_GROUP_GENE(GENE_ID);

CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_GENE_DESC START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_GENE_DESC (
    GENE_ID BIGINT NOT NULL PRIMARY KEY,
    SYMBOL VARCHAR(500) NOT NULL,
    TITLE VARCHAR(500) NOT NULL,
    TAX_ID BIGINT NOT NULL,
    PROT_GI BIGINT,
    PROT_ACC VARCHAR(500),
    PROT_LEN BIGINT,
    NUC_GI BIGINT,
    NUC_ACC VARCHAR(500),
    LOCUS_TAG VARCHAR(500)
);

CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_GENE_ALIAS START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_GENE_ALIAS (
    ALIAS_ID BIGINT NOT NULL PRIMARY KEY,
    GENE_ID BIGINT NOT NULL,
    NAME VARCHAR(500) NOT NULL,
    CONSTRAINT alias_gene_id_fkey FOREIGN KEY (GENE_ID) REFERENCES CATGENOME.HOMOLOG_GENE_DESC(GENE_ID)
);

CREATE SEQUENCE IF NOT EXISTS CATGENOME.S_HOMOLOG_GENE_DOMAIN START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS CATGENOME.HOMOLOG_GENE_DOMAIN (
    DOMAIN_ID BIGINT NOT NULL PRIMARY KEY,
    GENE_ID BIGINT NOT NULL,
    BEGIN BIGINT NOT NULL,
    END BIGINT NOT NULL,
    PSSMID BIGINT NOT NULL,
    CDDID VARCHAR(500) NOT NULL,
    CDDNAME VARCHAR(500) NOT NULL,
    CONSTRAINT domain_gene_id_fkey FOREIGN KEY (GENE_ID) REFERENCES CATGENOME.HOMOLOG_GENE_DESC(GENE_ID)
);
